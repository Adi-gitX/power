import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { PowerRun, claudeArgs, parseStreamLine } from '../src/main/engine/runner.js';
import type { RunEvent } from '../src/main/engine/types.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const POWER_ROOT = resolve(HERE, '..', '..', '..');
const FIXTURES = join(POWER_ROOT, 'packages', 'gates', 'test', 'fixtures');
const MOCK = join(HERE, 'mock-agent.mjs');

const created: string[] = [];
afterEach(() => {
  while (created.length > 0) rmSync(created.pop()!, { recursive: true, force: true });
});

function scratchRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'power-desktop-'));
  created.push(dir);
  return dir;
}

/**
 * The whole pipeline with mock agents and REAL everything else: the same
 * run-state.mjs, the same gate.mjs, the same schemas. The mocks only stand in
 * for the model; the machinery being tested is the machinery that ships.
 */
describe('the desktop engine drives the full pipeline', () => {
  it(
    'reaches done through real gates, pausing exactly once for approval',
    { timeout: 120_000 },
    async () => {
      const repoDir = scratchRepo();
      const events: RunEvent[] = [];
      let approvals = 0;

      const run = new PowerRun({
        repoDir,
        goal: 'a CLI that converts CSV to JSON, with tests',
        powerRoot: POWER_ROOT,
        agentCommand: (role) => ({ cmd: 'node', args: [MOCK, role, repoDir, FIXTURES] }),
      });
      run.on('event', (e: RunEvent) => {
        events.push(e);
        if (e.type === 'needs_approval') {
          approvals += 1;
          run.approve();
        }
      });

      await run.run();

      const gates = events.filter((e) => e.type === 'gate');
      expect(gates.map((g) => `${g.stage}:${g.pass}`)).toEqual([
        'research:true',
        'spec:true',
        'verification:true',
      ]);
      expect(approvals).toBe(1);
      expect(events.some((e) => e.type === 'done')).toBe(true);
      expect(events.some((e) => e.type === 'blocked' || e.type === 'error')).toBe(false);

      const done = events.find((e) => e.type === 'done')!;
      expect(done.type === 'done' && done.summary).toContain('phase        done');
      expect(done.type === 'done' && done.summary).toContain('deployable   yes');
    },
  );

  it(
    'blocks after the retry budget when an agent cannot satisfy its gate',
    { timeout: 120_000 },
    async () => {
      const repoDir = scratchRepo();
      const events: RunEvent[] = [];

      const run = new PowerRun({
        repoDir,
        goal: 'a run whose research can never pass',
        powerRoot: POWER_ROOT,
        // The researcher always writes the broken fixture set.
        agentCommand: (role) => ({ cmd: 'node', args: [MOCK, role, repoDir, FIXTURES, 'broken'] }),
      });
      run.on('event', (e: RunEvent) => events.push(e));

      await run.run();

      // 1 attempt + 2 counted retries = 3 gate failures, then blocked.
      const failures = events.filter((e) => e.type === 'gate' && !e.pass);
      expect(failures).toHaveLength(3);
      const retries = events.filter((e) => e.type === 'retry');
      expect(retries).toHaveLength(2);

      const blocked = events.find((e) => e.type === 'blocked');
      expect(blocked, 'the run must block rather than loop or lie').toBeDefined();
      expect(blocked!.type === 'blocked' && blocked!.reason).toContain('research');

      // And it never reached the human gate, let alone done.
      expect(events.some((e) => e.type === 'needs_approval')).toBe(false);
      expect(events.some((e) => e.type === 'done')).toBe(false);
    },
  );

  it('carries the gate\'s rule violations into the retry brief', { timeout: 120_000 }, async () => {
    const repoDir = scratchRepo();
    const dispatches: string[] = [];

    const run = new PowerRun({
      repoDir,
      goal: 'observe retry briefs',
      powerRoot: POWER_ROOT,
      agentCommand: (role, dispatch) => {
        dispatches.push(dispatch);
        return { cmd: 'node', args: [MOCK, role, repoDir, FIXTURES, 'broken'] };
      },
    });
    run.on('event', () => {});
    await run.run();

    // Attempts 2 and 3 must quote the specific failed rules, not say "try again".
    const retryBriefs = dispatches.slice(1);
    expect(retryBriefs.length).toBeGreaterThan(0);
    for (const brief of retryBriefs) {
      // The brief must demand a fix, not a redo — redoing is the expensive
      // failure mode — and must quote the actual rule violations.
      expect(brief).toContain('RETRY, not a redo');
      expect(brief).toContain('fix ONLY these violations');
      expect(brief).toMatch(/research\.json/);
    }
  });
});

describe('run options', () => {
  it(
    'the cheapest run dispatches only architect → implementer → verifier and never pauses',
    { timeout: 120_000 },
    async () => {
      const repoDir = scratchRepo();
      const events: RunEvent[] = [];
      const roles: string[] = [];

      const run = new PowerRun({
        repoDir,
        goal: 'cheapest possible honest run',
        powerRoot: POWER_ROOT,
        features: {
          tier: 'eco',
          research: false,
          reviewTest: false,
          docs: false,
          autoApprove: true,
          packs: false,
        },
        agentCommand: (role) => {
          roles.push(role);
          return { cmd: 'node', args: [MOCK, role, repoDir, FIXTURES] };
        },
      });
      run.on('event', (e: RunEvent) => events.push(e));
      await run.run();

      expect(roles).toEqual(['architect', 'implementer', 'verifier']);
      // The pause never surfaced — but the approval itself still happened,
      // through the reducer, after the spec gate passed.
      expect(events.some((e) => e.type === 'needs_approval')).toBe(false);
      const done = events.find((e) => e.type === 'done');
      expect(done, 'run must reach done').toBeDefined();
      expect(done!.type === 'done' && done!.summary).toContain('research=skipped');
      expect(done!.type === 'done' && done!.summary).toContain('deployable   yes');
    },
  );

  it('eco tier pins every dispatch to sonnet with tightened caps', () => {
    const eco = claudeArgs('implementer', 'd', 'sys', '/tmp/x', {
      tier: 'eco',
      research: true,
      reviewTest: true,
      docs: true,
      autoApprove: false,
      packs: false,
    });
    expect(eco[eco.indexOf('--model') + 1]).toBe('sonnet');
    expect(Number(eco[eco.indexOf('--max-turns') + 1])).toBe(42); // 60 × 0.7

    const balanced = claudeArgs('researcher', 'd', 'sys', '/tmp/x', {
      tier: 'balanced',
      research: true,
      reviewTest: true,
      docs: true,
      autoApprove: false,
      packs: false,
    });
    expect(balanced[balanced.indexOf('--model') + 1]).toBe('sonnet');
    expect(balanced).toContain('stream-json');
  });

  it('parses real stream-json frames and passes mock plain text through', () => {
    expect(
      parseStreamLine(
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Reading the spec."}]}}',
      ),
    ).toEqual({ kind: 'text', text: 'Reading the spec.' });
    expect(
      parseStreamLine('{"type":"result","subtype":"success","total_cost_usd":0.4187,"num_turns":14}'),
    ).toEqual({ kind: 'usage', costUsd: 0.4187, turns: 14 });
    expect(parseStreamLine('researcher: wrote golden artifacts')).toEqual({
      kind: 'raw',
      line: 'researcher: wrote golden artifacts',
    });
    // Tool-use frames are noise to the card, not lines.
    expect(parseStreamLine('{"type":"system","subtype":"init"}')).toEqual({ kind: 'noise' });
  });
});

describe('efficiency contract', () => {
  const features = { ...({} as object), tier: 'auto', research: true, reviewTest: true, docs: true, autoApprove: false, packs: false } as import('../src/main/engine/types.js').RunFeatures;

  it('auto tier runs a simple goal entirely on sonnet with tightened caps', () => {
    const args = claudeArgs('implementer', 'd', 'sys', '/tmp/x', features, 'a small html welcome page');
    expect(args[args.indexOf('--model') + 1]).toBe('sonnet');
    expect(Number(args[args.indexOf('--max-turns') + 1])).toBe(42); // 60 × 0.7
  });

  it('auto tier keeps the per-role map for complex goals', () => {
    const args = claudeArgs('implementer', 'd', 'sys', '/tmp/x', features, 'a dashboard with auth and a database');
    expect(args[args.indexOf('--model') + 1]).toBe('opus');
    expect(Number(args[args.indexOf('--max-turns') + 1])).toBe(60);
  });

  it('a resumed retry never re-sends the system prompt', () => {
    const args = claudeArgs('architect', 'fix these violations', 'THE-40KB-PROMPT', '/tmp/x', features, 'simple page', 'sess-123');
    expect(args).toContain('--resume');
    expect(args).toContain('sess-123');
    expect(args).not.toContain('--append-system-prompt');
    expect(args.join(' ')).not.toContain('THE-40KB-PROMPT');
    // And the fix budget is a fraction of a fresh stage's.
    expect(Number(args[args.indexOf('--max-turns') + 1])).toBeLessThanOrEqual(10);
  });

  it('captures session ids from both frame shapes', () => {
    expect(parseStreamLine('{"type":"system","subtype":"init","session_id":"abc"}'))
      .toEqual({ kind: 'session', sessionId: 'abc' });
    const usage = parseStreamLine('{"type":"result","total_cost_usd":0.1,"num_turns":3,"session_id":"abc"}');
    expect(usage).toMatchObject({ kind: 'usage', sessionId: 'abc' });
  });
});

describe('the never-stops guarantee (provider fallback)', () => {
  it(
    'a gateway that fails EVERY dispatch still reaches done via the Claude floor',
    { timeout: 120_000 },
    async () => {
      const repoDir = scratchRepo();
      const events: RunEvent[] = [];
      // Each role: the first dispatch (the gateway) fails; the fallback to the
      // Claude default runs the real mock. So every stage survives a dead
      // provider without the run ever stopping.
      const calls = new Map<string, number>();

      const run = new PowerRun({
        repoDir,
        goal: 'a CLI that converts CSV to JSON, with tests',
        powerRoot: POWER_ROOT,
        // A gateway trusted with every role — the "maximum free" shape.
        providers: [
          {
            id: 'omniroute',
            label: 'OmniRoute',
            kind: 'gateway',
            baseUrl: 'http://127.0.0.1:20128',
            allowRoles: [
              'researcher',
              'architect',
              'implementer',
              'reviewer',
              'tester',
              'verifier',
              'documenter',
            ],
            costWeight: 0,
          },
        ] as never,
        agentCommand: (role) => {
          const n = (calls.get(role) ?? 0) + 1;
          calls.set(role, n);
          // First call for a role = the gateway attempt → fail hard.
          if (n === 1) return { cmd: 'node', args: ['-e', 'process.exit(1)'] };
          // Second call = the Claude fallback → the real fixture mock.
          return { cmd: 'node', args: [MOCK, role, repoDir, FIXTURES] };
        },
      });
      run.on('event', (e: RunEvent) => {
        events.push(e);
        if (e.type === 'needs_approval') run.approve();
      });

      await run.run();

      // It finished, and every gate passed on the fallback's artifacts.
      expect(events.some((e) => e.type === 'done')).toBe(true);
      expect(events.filter((e) => e.type === 'gate').every((g) => g.pass)).toBe(true);
      // The fallback was visible, not silent.
      expect(
        events.some((e) => e.type === 'agent' && /retrying on your Claude login/.test(e.line)),
      ).toBe(true);
      // Every role really did fall back (2 calls: gateway fail + Claude mock).
      for (const [, n] of calls) expect(n).toBe(2);
    },
  );
});
