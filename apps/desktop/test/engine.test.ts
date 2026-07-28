import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { PowerRun } from '../src/main/engine/runner.js';
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
      expect(brief).toContain('FAILED its gate');
      expect(brief).toMatch(/research\.json/);
    }
  });
});
