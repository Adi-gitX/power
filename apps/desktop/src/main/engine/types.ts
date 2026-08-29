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
  | { type: 'agent_usage'; role: Role; costUsd: number; turns: number }
  | { type: 'route'; role: Role; providerId: string; providerLabel: string }
  | {
      type: 'run_usage';
      costUsd: number;
      byProvider?: { providerId: string; label: string; costUsd: number; turns: number }[];
    }
  | { type: 'needs_approval'; specPath: string }
  | { type: 'state'; raw: string }
  | { type: 'blocked'; reason: string }
  | { type: 'done'; summary: string }
  | { type: 'error'; message: string };

/** Per-run controls, chosen in the ask box. Every flag is honest: a skipped
 * stage is recorded as skipped, never faked as passed. */
export interface RunFeatures {
  /** auto: sonnet for simple goals, per-role for complex · eco/balanced/max as named */
  tier: 'auto' | 'eco' | 'balanced' | 'max';
  research: boolean;
  reviewTest: boolean;
  docs: boolean;
  autoApprove: boolean;
  packs: boolean;
}

export const DEFAULT_FEATURES: RunFeatures = {
  tier: 'auto',
  research: true,
  reviewTest: true,
  docs: true,
  autoApprove: false,
  packs: false,
};

export interface EngineOptions {
  /** Absolute path of the repository the run works in. */
  repoDir: string;
  /** The goal sentence. */
  goal: string;
  /** Run options; defaults to DEFAULT_FEATURES. */
  features?: RunFeatures;
  /** Absolute path of the Power plugin root (scripts/, agents/). */
  powerRoot: string;
  /**
   * Extra providers the user has configured (gateways, cheap keys). The
   * built-in Claude default is always present implicitly; this is only the
   * additions. Empty/omitted = every stage runs on your Claude login, exactly
   * as before this feature existed.
   */
  providers?: import('./providers.js').Provider[];
  /**
   * Command used to dispatch one agent stage. The default spawns the `claude`
   * CLI headless. Tests inject a mock that writes artifacts directly, which is
   * what lets the whole pipeline — real state machine, real gates — run in CI
   * with no model and no network.
   */
  agentCommand?: (role: Role, dispatch: string) => { cmd: string; args: string[] };
}
