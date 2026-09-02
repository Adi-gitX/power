/**
 * The desktop orchestrator: `jobs/build.md` as deterministic code.
 *
 * The plugin's build job is a recipe an orchestrating model follows. Here the
 * same pipeline is a program — every state transition through the same
 * `run-state.mjs`, every gate through the same `gate.mjs`, the same retry caps,
 * the same single human approval. What the model provided in the plugin
 * (reading the recipe, deciding the next step) is control flow here; what the
 * model actually adds (doing a stage's work) stays a model, dispatched headless
 * per stage with the compiled agent prompt.
 *
 * Auth follows from that split: agent stages run through the user's own
 * `claude` CLI login. The app holds no API key, stores no credential, and
 * reopens none of the custody problems the plugin pivot deleted.
 */
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_FEATURES,
  type EngineOptions,
  type Role,
  type RunEvent,
  type RunFeatures,
  type StageId,
} from './types.js';
import {
  CLAUDE_DEFAULT,
  chooseProvider,
  compactBrief,
  detectGateway,
  providerEnv,
  type Provider,
} from './providers.js';

/**
 * Cost discipline, per role. The registry already decided researcher and
 * documenter are sonnet-class work; the engine now honours that instead of
 * dispatching every stage on the session default. Turn caps bound the worst
 * case: a stage that has not converged by its cap is not converging, and
 * burning further budget on it is the retry loop's job to decide, not the
 * stage's.
 */
const TIER_CAP_MULTIPLIER: Record<RunFeatures['tier'], number> = {
  auto: 1, // resolved per goal below
  eco: 0.7,
  balanced: 1,
  max: 1.3,
};

/** Mirror of the Swift ModelPolicy — the engines stay one product. */
const COMPLEXITY_MARKERS = [
  'auth', 'database', 'payment', 'stripe', 'api', 'backend', 'server',
  'realtime', 'websocket', 'dashboard', 'login', 'integration', 'sync',
  'multi', 'search', 'upload', 'deploy',
];
export function goalIsComplex(goal: string): boolean {
  const lower = goal.toLowerCase();
  return goal.length > 90 || COMPLEXITY_MARKERS.some((m) => lower.includes(m));
}

/**
 * The speed lever. A small prompt should not pay for a seven-stage pipeline —
 * each stage is a separate cold `claude` round-trip, and research/review/test/
 * docs are the slowest of them. So the default `auto` tier, faced with a simple
 * goal, runs an EXPRESS pipeline: spec → implement → verify, auto-approved. That
 * is 3 model calls instead of 7, and it drops the slowest stages, while keeping
 * verify (the deploy gate, the product's promise). Any explicit tier
 * (eco/balanced/max) is honoured verbatim — express is only auto's judgement,
 * and a complex goal keeps the full pipeline even on auto.
 */
export function expressFeatures(f: RunFeatures, goal = ''): RunFeatures {
  if (f.tier !== 'auto' || goalIsComplex(goal)) return f;
  return { ...f, research: false, reviewTest: false, docs: false, autoApprove: true };
}

const ROLE_MODEL: Record<string, string> = {
  researcher: 'sonnet',
  architect: 'opus',
  implementer: 'opus',
  reviewer: 'opus',
  tester: 'opus',
  verifier: 'opus',
  documenter: 'sonnet',
};
const ROLE_MAX_TURNS: Record<string, number> = {
  researcher: 30,
  architect: 25,
  implementer: 60,
  reviewer: 25,
  tester: 40,
  verifier: 30,
  documenter: 25,
};

const GATE_RETRY_EDGE: Record<string, string> = {
  research: 'research_refetch',
  spec: 'spec_revision',
  verification: 'needs_fixes',
};

/** The headless dispatch argv, pure so tests can assert cost controls hold. */
export function claudeArgs(
  role: Role,
  dispatch: string,
  systemPrompt: string,
  repoDir: string,
  features: RunFeatures,
  goal = '',
  resume?: string,
  modelOverride?: string,
): string[] {
  const complex = goalIsComplex(goal);
  const model =
    modelOverride ??
    (features.tier === 'eco' ? 'sonnet'
    : features.tier === 'max' ? 'opus'
    : features.tier === 'auto' ? (complex ? (ROLE_MODEL[role] ?? 'sonnet') : 'sonnet')
    : (ROLE_MODEL[role] ?? 'sonnet'));
  const mult = features.tier === 'auto' ? (complex ? 1 : 0.7) : TIER_CAP_MULTIPLIER[features.tier];
  const turns = Math.round((ROLE_MAX_TURNS[role] ?? 30) * mult);
  const args = ['-p', dispatch];
  if (resume) {
    // The turnaround killer: the warm session already holds the role prompt
    // and everything it read — the payload is only the fix, and the system
    // prompt is never re-sent.
    args.push('--resume', resume, '--max-turns', String(Math.max(10, Math.round(turns / 3))));
  } else {
    args.push('--append-system-prompt', systemPrompt, '--max-turns', String(turns));
  }
  args.push(
    '--permission-mode',
    'acceptEdits',
    '--add-dir',
    repoDir,
    '--model',
    model,
    // stream-json is what makes cost visible: assistant frames carry the text
    // the UI shows, and the final result frame carries total_cost_usd/num_turns.
    '--output-format',
    'stream-json',
    '--verbose',
  );
  return args;
}

/** One parsed stream-json line. Non-JSON input (mock agents) passes through raw. */
export function parseStreamLine(
  line: string,
):
  | { kind: 'text'; text: string }
  | { kind: 'usage'; costUsd: number; turns: number; sessionId?: string }
  | { kind: 'session'; sessionId: string }
  | { kind: 'raw'; line: string }
  | { kind: 'noise' } {
  if (!line.startsWith('{')) return { kind: 'raw', line };
  try {
    const frame = JSON.parse(line) as {
      type?: string;
      message?: { content?: { type?: string; text?: string }[] };
      total_cost_usd?: number;
      num_turns?: number;
    };
    if (frame.type === 'assistant') {
      const text = (frame.message?.content ?? [])
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text)
        .join('\n')
        .trim();
      return text ? { kind: 'text', text } : { kind: 'noise' };
    }
    if (frame.type === 'result') {
      const usage: { kind: 'usage'; costUsd: number; turns: number; sessionId?: string } = {
        kind: 'usage',
        costUsd: frame.total_cost_usd ?? 0,
        turns: frame.num_turns ?? 0,
      };
      if (typeof (frame as { session_id?: string }).session_id === 'string') {
        usage.sessionId = (frame as { session_id?: string }).session_id;
      }
      return usage;
    }
    if (frame.type === 'system' && typeof (frame as { session_id?: string }).session_id === 'string') {
      return { kind: 'session', sessionId: (frame as { session_id: string }).session_id };
    }
    return { kind: 'noise' };
  } catch {
    return { kind: 'raw', line };
  }
}

/** Exit codes from the wrappers: 0 pass, 1 refused/failed, 2 usage/env error. */
class ToolFailure extends Error {
  constructor(
    readonly code: number,
    readonly output: string,
  ) {
    super(output);
  }
}

export class PowerRun extends EventEmitter {
  private approvalResolver: ((approved: { ok: boolean; reason?: string }) => void) | null = null;
  private stopped = false;
  private activeChild: ReturnType<typeof spawn> | null = null;
  private readonly features: RunFeatures;
  private readonly providers: Provider[];
  private totalCostUsd = 0;
  /** Cost and turns attributed to each provider that served a stage — the
   * honest savings story: where the spend went, and how much left Anthropic. */
  private readonly costByProvider = new Map<string, { label: string; costUsd: number; turns: number }>();
  /** The claude session of the most recent dispatch — what a retry resumes. */
  private lastAgentSession: string | null = null;
  /** Which provider produced that session — a resume never crosses providers. */
  private lastSessionProvider: string | null = null;

  constructor(private readonly opts: EngineOptions) {
    super();
    this.features = expressFeatures(opts.features ?? DEFAULT_FEATURES, opts.goal);
    this.providers = opts.providers ?? [];
  }

  private emitEvent(event: RunEvent): void {
    this.emit('event', event);
  }

  /** The UI answers the one human gate through these. */
  approve(): void {
    this.approvalResolver?.({ ok: true });
  }
  reject(reason: string): void {
    this.approvalResolver?.({ ok: false, reason });
  }
  /** Stop means stop: flag the loop AND kill whatever is burning right now. */
  stop(): void {
    this.stopped = true;
    this.activeChild?.kill('SIGTERM');
  }

  private exec(
    cmd: string,
    args: string[],
    onLine?: (line: string) => void,
    envOverlay?: Record<string, string>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // `node` runs as ourselves: under Electron, execPath + ELECTRON_RUN_AS_NODE
      // is a plain node, so a Finder-launched app (PATH=/usr/bin:/bin) needs no
      // node installed on PATH. Under vitest execPath already is node.
      const viaSelf = cmd === 'node';
      const baseEnv = viaSelf ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : { ...process.env };
      // A gateway provider redirects this one dispatch by overlaying
      // ANTHROPIC_BASE_URL/ANTHROPIC_AUTH_TOKEN — never mutating the app's env.
      const child = spawn(viaSelf ? process.execPath : cmd, args, {
        cwd: this.opts.repoDir,
        env: { ...baseEnv, ...(envOverlay ?? {}) },
      });
      this.activeChild = child;
      let out = '';
      const feed = (chunk: Buffer) => {
        const text = chunk.toString();
        out += text;
        if (onLine) for (const line of text.split('\n')) if (line.trim()) onLine(line);
      };
      child.stdout.on('data', feed);
      child.stderr.on('data', feed);
      child.on('error', (error) => reject(new ToolFailure(2, String(error))));
      child.on('close', (code) =>
        code === 0 ? resolve(out) : reject(new ToolFailure(code ?? 1, out)),
      );
    });
  }

  /**
   * The compiled CLIs, not the dev wrappers. `scripts/*.mjs` launch tsx to run
   * TypeScript straight from src — right for the plugin and the terminal, wrong
   * inside a packaged app, where the TS loader chain is one more thing to break
   * (and did, on the first real run). The packages are already compiled to
   * plain JS by `tsc --build`; the app calls that, and the only runtime it
   * needs is the node it already carries.
   */
  private state(args: string[]): Promise<string> {
    return this.exec('node', [
      join(this.opts.powerRoot, 'packages', 'core', 'dist', 'cli.js'),
      ...args,
    ]);
  }

  private async gate(stage: 'research' | 'spec' | 'verification'): Promise<boolean> {
    try {
      const out = await this.exec('node', [
        join(this.opts.powerRoot, 'packages', 'gates', 'dist', 'cli.js'),
        stage,
        join(this.opts.repoDir, '.power', 'artifacts'),
      ]);
      this.emitEvent({ type: 'gate', stage, pass: true, detail: out.trim() });
      return true;
    } catch (error) {
      if (error instanceof ToolFailure && error.code === 1) {
        this.emitEvent({ type: 'gate', stage, pass: false, detail: error.output.trim() });
        return false;
      }
      throw error;
    }
  }

  /** Dispatch one specialist, exactly as jobs/build.md specifies a dispatch. */
  private async dispatch(role: Role, briefLines: string[], resume?: string): Promise<void> {
    const promptPath = join(this.opts.powerRoot, 'agents', `${role}.md`);
    // Agent prompts point at their on-demand playbooks via
    // ${CLAUDE_PLUGIN_ROOT}/skills/... — set only by Claude Code's plugin host.
    // We run claude headless, so resolve it to the real runtime root or the
    // reference skills (and the gate script path) never load. See the twin in
    // apps/macos/Power/Engine.swift.
    const systemPrompt = existsSync(promptPath)
      ? readFileSync(promptPath, 'utf8').split('${CLAUDE_PLUGIN_ROOT}').join(this.opts.powerRoot)
      : '';
    // Route first: the cheapest provider trusted with this role. The built-in
    // Claude default is always eligible, so a role no cheap provider is trusted
    // with simply stays on Claude — no behaviour change from before providers.
    const chosen = chooseProvider(role, this.providers);
    // Conservative, lossless compaction — the safe half of token compression.
    const { lines: compact } = compactBrief(briefLines);
    const coldBrief = [
      `You are being dispatched as the ${role} on a Power run.`,
      '',
      `Repository (absolute path): ${this.opts.repoDir}`,
      `Artifacts directory: ${join(this.opts.repoDir, '.power', 'artifacts')}`,
      '',
      ...compact,
      '',
      'Use absolute paths throughout. Write only the artifacts your role owns.',
    ].join('\n');

    // One attempt against one provider. A resume id only survives if the SAME
    // provider produced it — a fallback across providers always goes cold,
    // because a session belongs to the endpoint that opened it.
    const execOn = async (provider: Provider): Promise<void> => {
      const useResume = !!resume && this.lastSessionProvider === provider.id;
      const dispatch = useResume ? compact.join('\n') : coldBrief;
      const modelOverride = provider.models?.[role];
      const command = this.opts.agentCommand
        ? this.opts.agentCommand(role, dispatch)
        : {
            cmd: 'claude',
            args: claudeArgs(
              role,
              dispatch,
              useResume ? '' : systemPrompt,
              this.opts.repoDir,
              this.features,
              this.opts.goal,
              useResume ? resume : undefined,
              modelOverride,
            ),
          };
      this.lastAgentSession = null;
      await this.exec(
        command.cmd,
        command.args,
        (line) => {
          const parsed = parseStreamLine(line);
          if (parsed.kind === 'session') {
            this.lastAgentSession = parsed.sessionId;
            this.lastSessionProvider = provider.id;
          } else if (parsed.kind === 'text') {
            for (const part of parsed.text.split('\n')) {
              if (part.trim()) this.emitEvent({ type: 'agent', role, line: part });
            }
          } else if (parsed.kind === 'raw') {
            this.emitEvent({ type: 'agent', role, line: parsed.line });
          } else if (parsed.kind === 'usage') {
            if (parsed.sessionId) {
              this.lastAgentSession = parsed.sessionId;
              this.lastSessionProvider = provider.id;
            }
            this.totalCostUsd += parsed.costUsd;
            const acc = this.costByProvider.get(provider.id) ?? {
              label: provider.label,
              costUsd: 0,
              turns: 0,
            };
            acc.costUsd += parsed.costUsd;
            acc.turns += parsed.turns;
            this.costByProvider.set(provider.id, acc);
            this.emitEvent({ type: 'agent_usage', role, costUsd: parsed.costUsd, turns: parsed.turns });
            this.emitEvent({
              type: 'run_usage',
              costUsd: this.totalCostUsd,
              byProvider: [...this.costByProvider.entries()].map(([id, v]) => ({
                providerId: id,
                label: v.label,
                costUsd: v.costUsd,
                turns: v.turns,
              })),
            });
          }
        },
        providerEnv(provider),
      );
    };

    // The "never stops" guarantee, in two layers:
    //  1. Preflight — if the chosen gateway is unreachable, degrade to your
    //     Claude login BEFORE spending a dispatch on a dead endpoint.
    //  2. On error — if a gateway dispatch fails anyway, fall back to Claude
    //     once. A flaky free provider costs you a reroute, never the run.
    // Claude itself has no fallback: it is the floor, and its failure is a real
    // failure the gate's retry loop should see.
    let provider = chosen;
    if (provider.kind === 'gateway' && !this.opts.agentCommand) {
      const reachable = await detectGateway(provider.baseUrl);
      if (!reachable) {
        this.emitEvent({
          type: 'agent',
          role,
          line: `⚠︎ ${provider.label} unreachable — falling back to your Claude login`,
        });
        provider = CLAUDE_DEFAULT;
      }
    }
    if (provider.id !== CLAUDE_DEFAULT.id) {
      this.emitEvent({ type: 'route', role, providerId: provider.id, providerLabel: provider.label });
    }

    try {
      await execOn(provider);
    } catch (error) {
      if (this.stopped) throw error; // a user Stop is not a provider fault
      if (provider.id === CLAUDE_DEFAULT.id) throw error; // the floor failing is real
      this.emitEvent({
        type: 'agent',
        role,
        line: `⚠︎ ${provider.label} failed this stage — retrying on your Claude login`,
      });
      await execOn(CLAUDE_DEFAULT);
    }
  }

  /**
   * Run a gated stage with the plugin's retry discipline: on failure take the
   * counted edge and re-dispatch with the gate's own errors in the brief; when
   * the budget is spent, block with the reason. Never edit the artifact, never
   * proceed past a failing gate.
   */
  private async gatedStage(
    stage: 'research' | 'spec' | 'verification',
    role: Role,
    brief: string[],
  ): Promise<boolean> {
    let lastGateOutput = '';
    let resumableSession: string | null = null;
    for (let attempt = 0; ; attempt += 1) {
      if (this.stopped) return false;
      if (attempt === 0) {
        await this.dispatch(role, brief);
      } else if (resumableSession) {
        this.emitEvent({ type: 'agent', role, line: '↻ retrying in the same session — violations only' });
        const fix = [
          'Your artifact FAILED its gate on exactly these rules:',
          lastGateOutput,
          'Edit the existing artifact to fix ONLY these violations. Do not redo the',
          'underlying work, do not refetch sources, do not restructure what passed.',
        ];
        try {
          await this.dispatch(role, fix, resumableSession);
        } catch {
          if (this.stopped) return false;
          this.emitEvent({ type: 'agent', role, line: 'session resume failed — cold retry' });
          await this.dispatch(role, [
            ...brief,
            '',
            'RETRY, not a redo. The artifact already exists — read it first. It FAILED',
            'its gate on exactly these rules:',
            lastGateOutput,
            'Edit the existing artifact to fix ONLY these violations.',
          ]);
        }
      } else {
        await this.dispatch(role, [
          ...brief,
          '',
          'RETRY, not a redo. The artifact already exists — read it first. It FAILED',
          'its gate on exactly these rules:',
          lastGateOutput,
          'Edit the existing artifact to fix ONLY these violations. Do not redo the',
          'underlying work, do not refetch sources, do not restructure what passed.',
        ]);
      }
      resumableSession = this.lastAgentSession ?? resumableSession;
      if (await this.gate(stage)) {
        await this.state(['gate', stage, 'pass']);
        return true;
      }
      lastGateOutput = this.lastGateDetail;
      try {
        const out = await this.state([
          'retry',
          GATE_RETRY_EDGE[stage]!,
          `gate ${stage} failed (attempt ${attempt + 1})`,
        ]);
        const used = (out.match(/→/g) ?? []).length; // cosmetic; caps live in the reducer
        this.emitEvent({
          type: 'retry',
          edge: GATE_RETRY_EDGE[stage]!,
          used: attempt + 1,
          cap: 2,
          reason: `gate ${stage} failed`,
        });
      } catch (error) {
        // The reducer refused: budget spent. Block with the specifics.
        await this.state([
          'apply',
          JSON.stringify({ type: 'block', reason: `${stage} gate unsatisfiable after retries` }),
        ]).catch(() => {});
        this.emitEvent({
          type: 'blocked',
          reason: `${stage} gate failed ${attempt + 1} times; retry budget spent. Last errors:\n${lastGateOutput}`,
        });
        return false;
      }
    }
  }

  private lastGateDetail = '';

  /**
   * Register the resolver BEFORE emitting `needs_approval`. Event listeners run
   * synchronously, so a UI (or test) that answers immediately would otherwise
   * call approve() while the resolver is still null and the run would hang
   * forever at its one human gate — which is the worst possible place to hang.
   */
  private awaitApproval(specPath: string): Promise<{ ok: boolean; reason?: string }> {
    const pending = new Promise<{ ok: boolean; reason?: string }>((resolve) => {
      this.approvalResolver = resolve;
    });
    this.emitEvent({ type: 'needs_approval', specPath });
    return pending.finally(() => {
      this.approvalResolver = null;
    });
  }

  private stage(stage: StageId, status: 'start' | 'pass' | 'fail'): void {
    this.emitEvent({ type: 'stage', stage, status });
  }

  async run(): Promise<void> {
    const { repoDir, goal } = this.opts;
    try {
      // Capture gate detail for retry briefs without re-running the gate.
      this.on('event', (e: RunEvent) => {
        if (e.type === 'gate' && !e.pass) this.lastGateDetail = e.detail;
      });

      this.stage('init', 'start');
      await this.state(['init', goal]);
      this.stage('init', 'pass');

      // ---- research (or its honest skip) ----
      const brief = join(repoDir, '.power', 'artifacts', 'brief.json');
      if (this.features.research) {
        this.stage('research', 'start');
        await this.state(['apply', '{"type":"start_research"}']);
        const researched = await this.gatedStage('research', 'researcher', [
          `Goal: ${goal}`,
          `Read the brief at ${brief} and resolve its unknowns[].`,
          'Write research.json and research.md to the artifacts directory.',
          'Every claim carries a source_url fetched on this run, listed in sources[].',
        ]);
        if (!researched) return this.stage('research', 'fail');
        this.stage('research', 'pass');
        await this.state(['apply', '{"type":"checkpoint_acknowledged"}']);
      } else {
        // Recorded as skipped in the state file — never faked as passed.
        await this.state(['apply', '{"type":"research_skipped"}']);
      }

      // ---- spec ----
      this.stage('spec', 'start');
      const specced = await this.gatedStage('spec', 'architect', [
        `Goal: ${goal}`,
        this.features.research
          ? 'Read brief.json, research.json, and research.md from the artifacts directory.'
          : 'No research ran on this run (skipped by run options). Read brief.json, decide ' +
            'from the goal and your own judgement, and record every assumption you make ' +
            'in the Open Questions section.',
        'Write SPEC.md there: YAML frontmatter with requirement_ids, all twelve required',
        'sections, at least one EARS criterion per requirement inside its own heading',
        'block, and tasks that each cite a real R#.',
      ]);
      if (!specced) return this.stage('spec', 'fail');
      this.stage('spec', 'pass');

      // ---- the one human gate ----
      this.stage('approval', 'start');
      const specPath = join(repoDir, '.power', 'artifacts', 'SPEC.md');
      // Auto-approve skips only the human pause. The reducer still refuses an
      // approval whose spec gate has not passed, so this cannot loosen anything.
      const verdict = this.features.autoApprove
        ? { ok: true as const }
        : await this.awaitApproval(specPath);
      if (!verdict.ok) {
        await this.state([
          'apply',
          JSON.stringify({ type: 'spec_rejected', reason: verdict.reason ?? 'rejected' }),
        ]);
        // One revision pass with the human's words, then re-ask — mirroring the recipe.
        this.stage('spec', 'start');
        const revised = await this.gatedStage('spec', 'architect', [
          `Goal: ${goal}`,
          `The human rejected the previous spec. Their reason: ${verdict.reason ?? 'none given'}.`,
          'Revise SPEC.md accordingly; the same gate rules apply.',
        ]);
        if (!revised) return this.stage('spec', 'fail');
        this.stage('spec', 'pass');
        const second = await this.awaitApproval(specPath);
        if (!second.ok) {
          await this.state(['apply', '{"type":"block","reason":"spec rejected twice"}']);
          this.emitEvent({ type: 'blocked', reason: 'Spec rejected twice; run blocked.' });
          return this.stage('approval', 'fail');
        }
      }
      await this.state(['apply', '{"type":"spec_approved"}']);
      this.stage('approval', 'pass');

      // ---- build ----
      this.stage('implement', 'start');
      const implementerBrief = [
        `Goal: ${goal}`,
        `Read ${specPath} and implement every P0 task, in the repository root.`,
        'Run your own build and tests before reporting. Report actual output.',
      ];
      if (this.features.packs) {
        try {
          const catalogue = await this.exec('node', [
            join(this.opts.powerRoot, 'packages', 'knowledge', 'dist', 'cli.js'),
            'selector',
          ]);
          implementerBrief.push(
            '',
            'Capability packs available to you (read the matching ones before implementing):',
            catalogue.slice(0, 30_000),
          );
        } catch {
          /* packs are an enhancement, never a blocker */
        }
      }
      await this.dispatch('implementer', implementerBrief);
      await this.state(['apply', '{"type":"self_verify","green":true}']);
      this.stage('implement', 'pass');

      // ---- review + test (skippable, engine-side only) ----
      // Sequential, not parallel: the engine tracks a single active child, so a
      // parallel pair would let Stop kill only one and leave the other burning
      // tokens. Sequential also keeps this identical to the Swift engine.
      if (this.features.reviewTest) {
        this.stage('review', 'start');
        await this.dispatch('reviewer', [
          'Review the implementation against SPEC.md. Write review.json to the artifacts directory.',
        ]);
        this.stage('review', 'pass');
        this.stage('test', 'start');
        await this.dispatch('tester', [
          'Run the test suite and exercise the spec’s criteria. Write test-report.json to the artifacts directory.',
        ]);
        this.stage('test', 'pass');
      }

      // ---- verify ----
      this.stage('verify', 'start');
      await this.state(['apply', '{"type":"start_verification"}']);
      const verified = await this.gatedStage('verification', 'verifier', [
        'Fresh-context acceptance: exercise every P0 requirement by real interaction.',
        'Write verification.json to the artifacts directory.',
      ]);
      if (!verified) return this.stage('verify', 'fail');
      this.stage('verify', 'pass');

      // ---- document (skippable) ----
      if (this.features.docs) {
        this.stage('document', 'start');
        await this.dispatch('documenter', [
          'Document the system as built: README at the repository root.',
          'Verify every command you write down by running it. Flag spec divergences.',
        ]);
        this.stage('document', 'pass');
      }

      const finalState = await this.state(['show']);
      this.emitEvent({ type: 'state', raw: finalState });
      this.stage('done', 'pass');
      this.emitEvent({ type: 'done', summary: finalState });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function readArtifact(repoDir: string, name: string): string | null {
  const path = join(repoDir, '.power', 'artifacts', name);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}
