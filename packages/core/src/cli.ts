#!/usr/bin/env tsx
/**
 * Run-state CLI — the state machine as a command the plugin can call.
 *
 * The reducer in `state.ts` is pure and already counts and caps every feedback
 * edge. This wraps it in the one thing a Claude Code session needs and a
 * long-lived orchestrator process does not: persistence to a file, so a run
 * survives the session that started it.
 *
 *   run-state init "<goal>"          create .power/run.json and brief.json
 *   run-state show                   phase, gates, retry budget, legal next steps
 *   run-state apply '<event-json>'   apply a RunEvent
 *   run-state gate <stage> pass|fail apply a gate result
 *   run-state retry <edge> "<why>"   take a feedback edge, if budget remains
 *
 * Every command prints the resulting phase. Exit 0 on success, 1 on a refused
 * transition or an exhausted retry budget, 2 on usage error — so the caller can
 * branch on the exit code without parsing prose.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  apply,
  canDeploy,
  createRunState,
  isTerminal,
  parseRunState,
  retriesRemaining,
  FEEDBACK_EDGES,
  MAX_RETRIES,
  StateError,
  type FeedbackEdge,
  type RunEvent,
  type RunState,
} from './state.js';
import { compileGoal } from './goal.js';
import { STAGES, isStage } from '@power/gates';

/** Everything a run owns lives here, relative to the repository root. */
const RUN_DIR = '.power';
const ARTIFACT_DIR = join(RUN_DIR, 'artifacts');
const STATE_FILE = join(RUN_DIR, 'run.json');

function usage(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function refuse(message: string): never {
  process.stderr.write(`  ✗ ${message}\n`);
  process.exit(1);
}

function statePath(root: string): string {
  return join(root, STATE_FILE);
}

function load(root: string): RunState {
  const path = statePath(root);
  if (!existsSync(path)) {
    refuse(`no run in progress (${STATE_FILE} not found). Start one with \`init\`.`);
  }
  try {
    return parseRunState(readFileSync(path, 'utf8'));
  } catch (cause) {
    refuse(`${STATE_FILE} is unreadable: ${(cause as Error).message}`);
  }
}

function save(root: string, state: RunState): void {
  mkdirSync(join(root, RUN_DIR), { recursive: true });
  writeFileSync(statePath(root), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/** A compact, greppable summary — this is what an agent reads to decide what to do. */
function describe(state: RunState): string {
  const gates = Object.entries(state.gates)
    .map(([stage, status]) => `${stage}=${status}`)
    .join(' ');
  const budget = FEEDBACK_EDGES.map(
    (edge) => `${edge}=${state.loops[edge]}/${MAX_RETRIES}`,
  ).join(' ');
  const deploy = canDeploy(state);

  const lines = [
    `phase        ${state.phase}`,
    `trace_id     ${state.trace_id}`,
    `gates        ${gates}`,
    `retries      ${budget}`,
    `approved     spec=${state.approved_spec} self_verify=${state.self_verify_green}`,
    `deployable   ${deploy.allowed ? 'yes' : `no — ${deploy.missing.join('; ')}`}`,
  ];
  if (state.blocked_reason) lines.push(`blocked      ${state.blocked_reason}`);
  if (isTerminal(state)) lines.push(`terminal     this run is finished`);
  return lines.join('\n');
}

function applyEvent(root: string, state: RunState, event: RunEvent): void {
  let next: RunState;
  try {
    next = apply(state, event);
  } catch (cause) {
    if (cause instanceof StateError) refuse(cause.message);
    throw cause;
  }
  save(root, next);
  process.stdout.write(`  ✓ ${event.type} → ${next.phase}\n`);
  if (next.phase === 'blocked') {
    process.stdout.write(`\n${describe(next)}\n`);
  }
}

function commandInit(root: string, args: readonly string[]): void {
  const goal = args.find((a) => !a.startsWith('--'));
  if (!goal) usage('usage: run-state init "<goal>" [--trace-id <id>]');

  const existing = statePath(root);
  if (existsSync(existing)) {
    refuse(
      `a run already exists at ${STATE_FILE}. Use \`show\` to inspect it, or delete ` +
        `${RUN_DIR}/ to start over — Power will not overwrite a run in progress.`,
    );
  }

  const traceIndex = args.indexOf('--trace-id');
  const traceId =
    traceIndex === -1
      ? `power-${Date.now().toString(36)}`
      : (args[traceIndex + 1] ?? usage('--trace-id needs a value'));

  let compiled;
  try {
    compiled = compileGoal({ goal, traceId });
  } catch (cause) {
    refuse((cause as Error).message);
  }

  mkdirSync(join(root, ARTIFACT_DIR), { recursive: true });
  writeFileSync(
    join(root, ARTIFACT_DIR, 'brief.json'),
    `${JSON.stringify(compiled.brief, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(join(root, ARTIFACT_DIR, 'rubric.md'), `${compiled.rubric}\n`, 'utf8');

  const state = createRunState(traceId);
  save(root, state);

  process.stdout.write(
    `  ✓ run ${traceId} created\n` +
      `    ${ARTIFACT_DIR}/brief.json   the compiled brief\n` +
      `    ${ARTIFACT_DIR}/rubric.md    what this run is graded against\n` +
      `    ${STATE_FILE}          phase ${state.phase}\n`,
  );
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const root = rootIndex === -1 ? process.cwd() : (args[rootIndex + 1] ?? usage('--root needs a value'));

  switch (command) {
    case 'init':
      return commandInit(root, args);

    case 'show': {
      process.stdout.write(`${describe(load(root))}\n`);
      return;
    }

    case 'apply': {
      const raw = args.find((a) => !a.startsWith('--'));
      if (!raw) usage(`usage: run-state apply '{"type":"start_research"}'`);
      let event: RunEvent;
      try {
        event = JSON.parse(raw) as RunEvent;
      } catch (cause) {
        usage(`event is not valid JSON: ${(cause as Error).message}`);
      }
      if (typeof event?.type !== 'string') usage('event needs a `type` field');
      return applyEvent(root, load(root), event);
    }

    case 'gate': {
      const [stage, verdict] = args.filter((a) => !a.startsWith('--'));
      if (!stage || !verdict) usage(`usage: run-state gate <${STAGES.join('|')}> <pass|fail>`);
      if (!isStage(stage)) usage(`unknown stage \`${stage}\`. Known: ${STAGES.join(', ')}`);
      if (verdict !== 'pass' && verdict !== 'fail') usage(`verdict must be pass or fail`);
      return applyEvent(root, load(root), {
        type: 'gate_result',
        stage,
        // The gate itself already reported its errors to the caller; the state
        // machine only needs the verdict, so this records the outcome rather
        // than duplicating the diagnostics.
        result: { stage, pass: verdict === 'pass', errors: [] },
      });
    }

    case 'retry': {
      const [edge, ...reason] = args.filter((a) => !a.startsWith('--'));
      if (!edge) usage(`usage: run-state retry <${FEEDBACK_EDGES.join('|')}> "<reason>"`);
      if (!(FEEDBACK_EDGES as readonly string[]).includes(edge)) {
        usage(`unknown edge \`${edge}\`. Known: ${FEEDBACK_EDGES.join(', ')}`);
      }
      const state = load(root);
      const left = retriesRemaining(state, edge as FeedbackEdge);
      if (left <= 0) {
        refuse(
          `no ${edge} retries left (${MAX_RETRIES} used). This run has to stop and ask ` +
            `for help rather than loop — apply {"type":"block"} with the reason.`,
        );
      }
      return applyEvent(root, state, {
        type: 'retry',
        edge: edge as FeedbackEdge,
        reason: reason.join(' ') || 'unspecified',
      });
    }

    default:
      usage('usage: run-state <init|show|apply|gate|retry> [args] [--root <dir>]');
  }
}

main();
