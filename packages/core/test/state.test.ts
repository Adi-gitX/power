import { describe, expect, it } from 'vitest';
import type { GateResult, Stage } from '@power/gates';
import {
  apply,
  canDeploy,
  createRunState,
  isTerminal,
  MAX_RETRIES,
  parseRunState,
  retriesRemaining,
  StateError,
  type Clock,
  type RunState,
} from '../src/state.js';

let tick = 0;
const clock: Clock = { now: () => `2026-07-27T00:00:${String(tick++).padStart(2, '0')}Z` };

const pass = (stage: Stage): GateResult => ({ stage, pass: true, errors: [] });
const fail = (stage: Stage): GateResult => ({
  stage,
  pass: false,
  errors: [{ artifact: 'x', field: 'y', rule: 'z', detail: 'nope' }],
});

/** Drive a run to the given phase through legal transitions only. */
function runTo(phase: 'research' | 'spec' | 'spec_approval' | 'build' | 'verify'): RunState {
  let state = apply(createRunState('trace-1', clock), { type: 'start_research' }, clock);
  if (phase === 'research') return state;

  state = apply(state, { type: 'gate_result', stage: 'research', result: pass('research') }, clock);
  state = apply(state, { type: 'checkpoint_acknowledged' }, clock);
  if (phase === 'spec') return state;

  state = apply(state, { type: 'gate_result', stage: 'spec', result: pass('spec') }, clock);
  if (phase === 'spec_approval') return state;

  state = apply(state, { type: 'spec_approved' }, clock);
  if (phase === 'build') return state;

  return apply(state, { type: 'start_verification' }, clock);
}

describe('the happy path', () => {
  it('runs intake through done and records every transition', () => {
    let state = runTo('verify');
    state = apply(state, { type: 'self_verify', green: true }, clock);
    state = apply(
      state,
      { type: 'gate_result', stage: 'verification', result: pass('verification') },
      clock,
    );

    expect(state.phase).toBe('done');
    expect(isTerminal(state)).toBe(true);
    expect(state.history.map((h) => h.to)).toEqual([
      'research',
      'research_review',
      'spec',
      'spec_approval',
      'build',
      'verify',
      'done',
    ]);
  });

  it('refuses further events once done', () => {
    let state = runTo('verify');
    state = apply(
      state,
      { type: 'gate_result', stage: 'verification', result: pass('verification') },
      clock,
    );
    expect(() => apply(state, { type: 'start_research' }, clock)).toThrow(/already done/);
  });
});

describe('gates', () => {
  it('a failed gate records the failure without advancing the phase', () => {
    const state = apply(
      runTo('research'),
      { type: 'gate_result', stage: 'research', result: fail('research') },
      clock,
    );
    expect(state.gates.research).toBe('fail');
    expect(state.phase).toBe('research');
    expect(state.history).toHaveLength(1); // only the start_research transition
  });

  it('a passing gate advances to the next phase', () => {
    const state = apply(
      runTo('research'),
      { type: 'gate_result', stage: 'research', result: pass('research') },
      clock,
    );
    expect(state.phase).toBe('research_review');
  });
});

describe('the human approval gate cannot be bypassed', () => {
  it('rejects approval before the spec gate has passed', () => {
    const state = runTo('spec');
    expect(() => apply(state, { type: 'spec_approved' }, clock)).toThrow(StateError);
    expect(() => apply(state, { type: 'spec_approved' }, clock)).toThrow(
      /has not passed its gate/,
    );
  });

  it('rejects jumping from spec straight to build', () => {
    const state = runTo('spec');
    expect(() => apply(state, { type: 'start_verification' }, clock)).toThrow(
      /illegal transition spec -> verify/,
    );
  });

  it('a rejected spec returns to the spec phase and clears the approval', () => {
    let state = runTo('spec_approval');
    state = apply(state, { type: 'spec_rejected', reason: 'scope too broad' }, clock);
    expect(state.phase).toBe('spec');
    expect(state.approved_spec).toBe(false);
    expect(state.history.at(-1)?.note).toBe('scope too broad');
  });
});

describe('bounded retries', () => {
  it('sends the run back to the producing phase while under the cap', () => {
    let state = runTo('build');
    state = apply(state, { type: 'retry', edge: 'needs_fixes', reason: 'R1 broken' }, clock);
    expect(state.phase).toBe('build');
    expect(state.loops.needs_fixes).toBe(1);
    expect(retriesRemaining(state, 'needs_fixes')).toBe(MAX_RETRIES - 1);
  });

  // The plan's explicit acceptance criterion: force repeated failure and assert
  // the run blocks rather than looping.
  it('blocks on the attempt after the cap instead of looping forever', () => {
    let state = runTo('build');
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      state = apply(state, { type: 'retry', edge: 'needs_fixes', reason: `try ${attempt}` }, clock);
      expect(state.phase).toBe('build');
    }

    state = apply(state, { type: 'retry', edge: 'needs_fixes', reason: 'still broken' }, clock);

    expect(state.phase).toBe('blocked');
    expect(isTerminal(state)).toBe(true);
    expect(state.loops.needs_fixes).toBe(MAX_RETRIES + 1);
    expect(state.blocked_reason).toContain('needs_fixes exceeded 2 attempts');
    expect(state.blocked_reason).toContain('still broken');
    expect(retriesRemaining(state, 'needs_fixes')).toBe(0);
  });

  it('counts each edge independently', () => {
    let state = runTo('build');
    state = apply(state, { type: 'retry', edge: 'needs_fixes', reason: 'a' }, clock);
    expect(state.loops.spec_revision).toBe(0);
    expect(state.loops.research_refetch).toBe(0);
  });

  it('routes each edge back to its own phase', () => {
    const fromSpec = apply(
      runTo('spec'),
      { type: 'retry', edge: 'research_refetch', reason: 'gap' },
      clock,
    );
    expect(fromSpec.phase).toBe('research');

    const fromApproval = apply(
      runTo('spec_approval'),
      { type: 'retry', edge: 'spec_revision', reason: 'ambiguous' },
      clock,
    );
    expect(fromApproval.phase).toBe('spec');
  });

  it('can be unblocked back into the phase that failed', () => {
    let state = runTo('build');
    for (let i = 0; i <= MAX_RETRIES; i++) {
      state = apply(state, { type: 'retry', edge: 'needs_fixes', reason: 'x' }, clock);
    }
    expect(state.phase).toBe('blocked');

    state = apply(state, { type: 'unblock', note: 'human widened the scope' }, clock);
    expect(state.phase).toBe('build');
    expect(state.blocked_reason).toBeNull();
  });
});

describe('the deploy guardrail', () => {
  it('refuses when nothing has been done and names every missing condition', () => {
    const decision = canDeploy(createRunState('t', clock));
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toHaveLength(3);
  });

  it('refuses on a green build alone', () => {
    let state = runTo('build');
    state = apply(state, { type: 'self_verify', green: true }, clock);
    const decision = canDeploy(state);
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toEqual(['verification.json has not passed its gate']);
  });

  it('refuses when verification passed but self-verify is red', () => {
    let state = runTo('verify');
    state = apply(state, { type: 'self_verify', green: false }, clock);
    state = apply(
      state,
      { type: 'gate_result', stage: 'verification', result: pass('verification') },
      clock,
    );
    expect(canDeploy(state).missing).toEqual(["the implementer's own checks are not green"]);
  });

  it('allows only when all three conditions hold', () => {
    let state = runTo('verify');
    state = apply(state, { type: 'self_verify', green: true }, clock);
    state = apply(
      state,
      { type: 'gate_result', stage: 'verification', result: pass('verification') },
      clock,
    );
    expect(canDeploy(state)).toEqual({ allowed: true, missing: [] });
  });
});

describe('persistence', () => {
  it('round-trips through JSON', () => {
    const state = runTo('build');
    expect(parseRunState(JSON.stringify(state))).toEqual(state);
  });

  it('rejects a corrupt or unversioned state file loudly', () => {
    expect(() => parseRunState('{')).toThrow(/not valid JSON/);
    expect(() => parseRunState('{"version":99}')).toThrow(/unsupported state.json version/);
    expect(() => parseRunState('{"version":1,"phase":"nope"}')).toThrow(/unknown phase/);
    expect(() => parseRunState('{"version":1,"phase":"intake"}')).toThrow(/missing trace_id/);
  });

  it('never mutates the state it is given', () => {
    const before = runTo('build');
    const snapshot = structuredClone(before);
    apply(before, { type: 'retry', edge: 'needs_fixes', reason: 'x' }, clock);
    expect(before).toEqual(snapshot);
  });
});

describe('research_skipped', () => {
  it('moves intake straight to spec and records the gate as skipped, not passed', () => {
    const state = apply(createRunState('t', clock), { type: 'research_skipped' }, clock);
    expect(state.phase).toBe('spec');
    expect(state.gates.research).toBe('skipped');
    expect(state.gates.research).not.toBe('pass');
  });

  it('is refused once research has started — a run cannot un-run research', () => {
    let state = createRunState('t', clock);
    state = apply(state, { type: 'start_research' }, clock);
    expect(() => apply(state, { type: 'research_skipped' }, clock)).toThrow(StateError);
  });

  it('does not weaken the deploy guardrail', () => {
    let state = apply(createRunState('t', clock), { type: 'research_skipped' }, clock);
    // Even with research skipped, deploying still needs approval + self-verify + verification.
    expect(canDeploy(state).allowed).toBe(false);
  });
});
