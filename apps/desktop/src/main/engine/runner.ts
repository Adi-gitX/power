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
import type { EngineOptions, Role, RunEvent, StageId } from './types.js';

const GATE_RETRY_EDGE: Record<string, string> = {
  research: 'research_refetch',
  spec: 'spec_revision',
  verification: 'needs_fixes',
};

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

  constructor(private readonly opts: EngineOptions) {
    super();
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
  stop(): void {
    this.stopped = true;
  }

  private exec(cmd: string, args: string[], onLine?: (line: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      // `node` runs as ourselves: under Electron, execPath + ELECTRON_RUN_AS_NODE
      // is a plain node, so a Finder-launched app (PATH=/usr/bin:/bin) needs no
      // node installed on PATH. Under vitest execPath already is node.
      const viaSelf = cmd === 'node';
      const child = spawn(viaSelf ? process.execPath : cmd, args, {
        cwd: this.opts.repoDir,
        env: viaSelf ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : process.env,
      });
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

  private state(args: string[]): Promise<string> {
    return this.exec('node', [join(this.opts.powerRoot, 'scripts', 'run-state.mjs'), ...args]);
  }

  private async gate(stage: 'research' | 'spec' | 'verification'): Promise<boolean> {
    try {
      const out = await this.exec('node', [join(this.opts.powerRoot, 'scripts', 'gate.mjs'), stage]);
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
  private async dispatch(role: Role, briefLines: string[]): Promise<void> {
    const promptPath = join(this.opts.powerRoot, 'agents', `${role}.md`);
    const dispatch = [
      `You are being dispatched as the ${role} on a Power run.`,
      '',
      `Repository (absolute path): ${this.opts.repoDir}`,
      `Artifacts directory: ${join(this.opts.repoDir, '.power', 'artifacts')}`,
      '',
      ...briefLines,
      '',
      'Use absolute paths throughout. Write only the artifacts your role owns.',
    ].join('\n');

    const command = this.opts.agentCommand
      ? this.opts.agentCommand(role, dispatch)
      : {
          cmd: 'claude',
          args: [
            '-p',
            dispatch,
            '--append-system-prompt',
            readFileSync(promptPath, 'utf8'),
            '--permission-mode',
            'acceptEdits',
            '--add-dir',
            this.opts.repoDir,
          ],
        };

    await this.exec(command.cmd, command.args, (line) =>
      this.emitEvent({ type: 'agent', role, line }),
    );
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
    for (let attempt = 0; ; attempt += 1) {
      if (this.stopped) return false;
      const fullBrief =
        attempt === 0
          ? brief
          : [
              ...brief,
              '',
              'The previous attempt FAILED its gate. The exact rule violations:',
              lastGateOutput,
              'Fix the artifact so these specific rules pass. Do not relax anything else.',
            ];
      await this.dispatch(role, fullBrief);
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

      // ---- research ----
      this.stage('research', 'start');
      await this.state(['apply', '{"type":"start_research"}']);
      const brief = join(repoDir, '.power', 'artifacts', 'brief.json');
      const researched = await this.gatedStage('research', 'researcher', [
        `Goal: ${goal}`,
        `Read the brief at ${brief} and resolve its unknowns[].`,
        'Write research.json and research.md to the artifacts directory.',
        'Every claim carries a source_url fetched on this run, listed in sources[].',
      ]);
      if (!researched) return this.stage('research', 'fail');
      this.stage('research', 'pass');
      await this.state(['apply', '{"type":"checkpoint_acknowledged"}']);

      // ---- spec ----
      this.stage('spec', 'start');
      const specced = await this.gatedStage('spec', 'architect', [
        `Goal: ${goal}`,
        'Read brief.json, research.json, and research.md from the artifacts directory.',
        'Write SPEC.md there: YAML frontmatter with requirement_ids, all twelve required',
        'sections, at least one EARS criterion per requirement inside its own heading',
        'block, and tasks that each cite a real R#.',
      ]);
      if (!specced) return this.stage('spec', 'fail');
      this.stage('spec', 'pass');

      // ---- the one human gate ----
      this.stage('approval', 'start');
      const specPath = join(repoDir, '.power', 'artifacts', 'SPEC.md');
      const verdict = await this.awaitApproval(specPath);
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
      await this.dispatch('implementer', [
        `Goal: ${goal}`,
        `Read ${specPath} and implement every P0 task, in the repository root.`,
        'Run your own build and tests before reporting. Report actual output.',
      ]);
      await this.state(['apply', '{"type":"self_verify","green":true}']);
      this.stage('implement', 'pass');

      // ---- review + test ----
      this.stage('review', 'start');
      this.stage('test', 'start');
      await Promise.all([
        this.dispatch('reviewer', [
          'Review the implementation against SPEC.md. Write review.json to the artifacts directory.',
        ]),
        this.dispatch('tester', [
          'Run the test suite and exercise the spec’s criteria. Write test-report.json to the artifacts directory.',
        ]),
      ]);
      this.stage('review', 'pass');
      this.stage('test', 'pass');

      // ---- verify ----
      this.stage('verify', 'start');
      await this.state(['apply', '{"type":"start_verification"}']);
      const verified = await this.gatedStage('verification', 'verifier', [
        'Fresh-context acceptance: exercise every P0 requirement by real interaction.',
        'Write verification.json to the artifacts directory.',
      ]);
      if (!verified) return this.stage('verify', 'fail');
      this.stage('verify', 'pass');

      // ---- document ----
      this.stage('document', 'start');
      await this.dispatch('documenter', [
        'Document the system as built: README at the repository root.',
        'Verify every command you write down by running it. Flag spec divergences.',
      ]);
      this.stage('document', 'pass');

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
