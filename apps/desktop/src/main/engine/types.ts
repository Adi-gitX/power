/** The eight specialists, by plugin short name. */
export type Role =
  | 'researcher'
  | 'architect'
  | 'implementer'
  | 'reviewer'
  | 'tester'
  | 'verifier'
  | 'documenter';

export type StageId =
  | 'init'
  | 'research'
  | 'spec'
  | 'approval'
  | 'implement'
  | 'review'
  | 'test'
  | 'verify'
  | 'document'
  | 'done';

/**
 * Everything the UI learns, it learns through these events. The engine never
 * reaches into the renderer; the renderer never reaches into the engine. One
 * stream, replayable, so the dashboard can reconstruct a run it did not watch.
 */
export type RunEvent =
  | { type: 'stage'; stage: StageId; status: 'start' | 'pass' | 'fail' }
  | { type: 'agent'; role: Role; line: string }
  | { type: 'gate'; stage: 'research' | 'spec' | 'verification'; pass: boolean; detail: string }
  | { type: 'retry'; edge: string; used: number; cap: number; reason: string }
  | { type: 'needs_approval'; specPath: string }
  | { type: 'state'; raw: string }
  | { type: 'blocked'; reason: string }
  | { type: 'done'; summary: string }
  | { type: 'error'; message: string };

export interface EngineOptions {
  /** Absolute path of the repository the run works in. */
  repoDir: string;
  /** The goal sentence. */
  goal: string;
  /** Absolute path of the Power plugin root (scripts/, agents/). */
  powerRoot: string;
  /**
   * Command used to dispatch one agent stage. The default spawns the `claude`
   * CLI headless. Tests inject a mock that writes artifacts directly, which is
   * what lets the whole pipeline — real state machine, real gates — run in CI
   * with no model and no network.
   */
  agentCommand?: (role: Role, dispatch: string) => { cmd: string; args: string[] };
}
