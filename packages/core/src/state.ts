/**
 * The run state machine.
 *
 * This is the orchestrator's private bookkeeping — `state.json` in the artifact
 * bus. It is deliberately a set of pure functions over a plain object: the whole
 * point is that a run can crash, be reloaded from disk, and continue, so no
 * state may live in a process.
 *
 * Two invariants the rest of the platform leans on:
 *
 *   1. Every feedback edge is counted and capped. A run that keeps failing stops
 *      and asks a human instead of looping. Unbounded retry is the single most
 *      expensive failure mode in an autonomous system — it burns budget while
 *      looking like progress.
 *   2. Deployment requires three independent conditions. A green build is not a
 *      pass.
 */
import type { GateResult, Stage } from '@power/gates';

export const PHASES = [
  'intake',
  'research',
  'research_review',
  'spec',
  'spec_approval',
  'build',
  'verify',
  'done',
  'blocked',
] as const;
export type Phase = (typeof PHASES)[number];

/** The bounded retry loops. Each maps to a specific "go back and redo" edge. */
export const FEEDBACK_EDGES = ['research_refetch', 'spec_revision', 'needs_fixes'] as const;
export type FeedbackEdge = (typeof FEEDBACK_EDGES)[number];

export type GateStatus = 'pending' | 'pass' | 'fail';

export interface TransitionRecord {
  at: string;
  from: Phase;
  to: Phase;
  event: string;
  note?: string;
}

export interface RunState {
  /** Schema version, so a persisted state can be migrated rather than guessed at. */
  version: 1;
  /** Correlates every worker brief, gate call, and log line for one run. */
  trace_id: string;
  phase: Phase;
  loops: Record<FeedbackEdge, number>;
  gates: Record<Stage, GateStatus>;
  /** The single hard human gate. */
  approved_spec: boolean;
  /** The implementer's own build/typecheck/test result. */
  self_verify_green: boolean;
  last_worker: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  history: TransitionRecord[];
}

export const MAX_RETRIES = 2;

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

export interface Clock {
  now(): string;
}

export const systemClock: Clock = { now: () => new Date().toISOString() };

export function createRunState(traceId: string, clock: Clock = systemClock): RunState {
  const at = clock.now();
  return {
    version: 1,
    trace_id: traceId,
    phase: 'intake',
    loops: { research_refetch: 0, spec_revision: 0, needs_fixes: 0 },
    gates: { research: 'pending', spec: 'pending', verification: 'pending' },
    approved_spec: false,
    self_verify_green: false,
    last_worker: null,
    blocked_reason: null,
    created_at: at,
    updated_at: at,
    history: [],
  };
}

/**
 * Events the orchestrator can apply. Modelled as a discriminated union so the
 * reducer's switch is exhaustive and a new event cannot be added without
 * handling it.
 */
export type RunEvent =
  | { type: 'start_research' }
  | { type: 'gate_result'; stage: Stage; result: GateResult }
  | { type: 'checkpoint_acknowledged' }
  | { type: 'spec_approved' }
  | { type: 'spec_rejected'; reason: string }
  | { type: 'build_started' }
  | { type: 'self_verify'; green: boolean }
  | { type: 'start_verification' }
  | { type: 'retry'; edge: FeedbackEdge; reason: string }
  | { type: 'worker_finished'; worker: string }
  | { type: 'block'; reason: string }
  | { type: 'unblock'; note: string };

/** Which phase a retry edge sends the run back to. */
const RETRY_TARGET: Record<FeedbackEdge, Phase> = {
  research_refetch: 'research',
  spec_revision: 'spec',
  needs_fixes: 'build',
};

/** Legal `phase -> phase` moves, so a bug cannot silently skip the approval gate. */
const ALLOWED: Record<Phase, readonly Phase[]> = {
  intake: ['research', 'blocked'],
  research: ['research_review', 'research', 'blocked'],
  research_review: ['spec', 'research', 'blocked'],
  spec: ['spec_approval', 'research', 'spec', 'blocked'],
  spec_approval: ['build', 'spec', 'blocked'],
  build: ['verify', 'build', 'blocked'],
  verify: ['done', 'build', 'blocked'],
  done: [],
  blocked: ['research', 'spec', 'build', 'verify'],
};

function transition(
  state: RunState,
  to: Phase,
  event: string,
  clock: Clock,
  note?: string,
): RunState {
  if (state.phase !== to && !ALLOWED[state.phase].includes(to)) {
    throw new StateError(
      `illegal transition ${state.phase} -> ${to} (event: ${event}). ` +
        `Allowed from ${state.phase}: ${ALLOWED[state.phase].join(', ') || 'none'}.`,
    );
  }
  const at = clock.now();
  return {
    ...state,
    phase: to,
    updated_at: at,
    history: [...state.history, { at, from: state.phase, to, event, ...(note ? { note } : {}) }],
  };
}

/**
 * Apply an event. Pure: returns a new state and never mutates the input, so the
 * caller can persist the result and trust that a failed write leaves the old
 * state intact.
 */
export function apply(state: RunState, event: RunEvent, clock: Clock = systemClock): RunState {
  if (state.phase === 'done' && event.type !== 'block') {
    throw new StateError(`run ${state.trace_id} is already done; refusing event ${event.type}`);
  }

  switch (event.type) {
    case 'start_research':
      return transition(state, 'research', event.type, clock);

    case 'gate_result': {
      const next: RunState = {
        ...state,
        gates: { ...state.gates, [event.stage]: event.result.pass ? 'pass' : 'fail' },
      };
      if (!event.result.pass) {
        // A failed gate is not a phase change — the producing agent fixes the
        // artifact and runs it again. Only the retry event moves the run.
        return { ...next, updated_at: clock.now() };
      }
      if (event.stage === 'research') return transition(next, 'research_review', event.type, clock);
      if (event.stage === 'spec') return transition(next, 'spec_approval', event.type, clock);
      return transition(next, 'done', event.type, clock);
    }

    case 'checkpoint_acknowledged':
      return transition(state, 'spec', event.type, clock);

    case 'spec_approved':
      if (state.gates.spec !== 'pass') {
        throw new StateError(
          'cannot approve a spec that has not passed its gate — approval is a human ' +
            'decision about content, not a way around a structural defect',
        );
      }
      return transition({ ...state, approved_spec: true }, 'build', event.type, clock);

    case 'spec_rejected':
      return transition({ ...state, approved_spec: false }, 'spec', event.type, clock, event.reason);

    case 'build_started':
      return transition(state, 'build', event.type, clock);

    case 'self_verify':
      return { ...state, self_verify_green: event.green, updated_at: clock.now() };

    case 'start_verification':
      return transition(state, 'verify', event.type, clock);

    case 'retry': {
      const count = state.loops[event.edge] + 1;
      const withCount: RunState = {
        ...state,
        loops: { ...state.loops, [event.edge]: count },
      };
      if (count > MAX_RETRIES) {
        return transition(
          {
            ...withCount,
            blocked_reason:
              `${event.edge} exceeded ${MAX_RETRIES} attempts. Last reason: ${event.reason}`,
          },
          'blocked',
          event.type,
          clock,
          event.reason,
        );
      }
      return transition(withCount, RETRY_TARGET[event.edge], event.type, clock, event.reason);
    }

    case 'worker_finished':
      return { ...state, last_worker: event.worker, updated_at: clock.now() };

    case 'block':
      return transition({ ...state, blocked_reason: event.reason }, 'blocked', event.type, clock);

    case 'unblock':
      return transition(
        { ...state, blocked_reason: null },
        RETRY_TARGET[
          (Object.keys(state.loops) as FeedbackEdge[]).find(
            (edge) => state.loops[edge] > MAX_RETRIES,
          ) ?? 'needs_fixes'
        ],
        event.type,
        clock,
        event.note,
      );
  }
}

export interface DeployDecision {
  allowed: boolean;
  /** Every unmet condition, so the operator sees the whole picture at once. */
  missing: string[];
}

/**
 * The deploy guardrail. All three conditions must hold. Deliberately a separate
 * function rather than a phase, because it is a question that can be asked at
 * any time — including by a human wanting to know why a run has not shipped.
 */
export function canDeploy(state: RunState): DeployDecision {
  const missing: string[] = [];
  if (!state.approved_spec) missing.push('the spec has not been approved by a human');
  if (!state.self_verify_green) missing.push("the implementer's own checks are not green");
  if (state.gates.verification !== 'pass') {
    missing.push('verification.json has not passed its gate');
  }
  return { allowed: missing.length === 0, missing };
}

/** Retries left on an edge before the run blocks. */
export function retriesRemaining(state: RunState, edge: FeedbackEdge): number {
  return Math.max(0, MAX_RETRIES - state.loops[edge]);
}

export function isTerminal(state: RunState): boolean {
  return state.phase === 'done' || state.phase === 'blocked';
}

/** Parse and validate a persisted state, so a corrupt file fails loudly. */
export function parseRunState(raw: string): RunState {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (cause) {
    throw new StateError(`state.json is not valid JSON: ${(cause as Error).message}`);
  }
  const state = data as Partial<RunState>;
  if (state.version !== 1) {
    throw new StateError(`unsupported state.json version: ${String(state.version)}`);
  }
  if (!state.phase || !(PHASES as readonly string[]).includes(state.phase)) {
    throw new StateError(`state.json has unknown phase: ${String(state.phase)}`);
  }
  if (!state.trace_id) throw new StateError('state.json is missing trace_id');
  return state as RunState;
}
