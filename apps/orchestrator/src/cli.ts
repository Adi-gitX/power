#!/usr/bin/env tsx
/**
 * Power orchestrator CLI.
 *
 *   sync                          push the agent registry into the workspace
 *   run "<goal>" [--repo url]     start and drive a run
 *   gate <stage> <dir>            evaluate a gate against local artifacts
 *
 * Auth is BYOK: ANTHROPIC_API_KEY is the customer's own key. Nothing here holds
 * inference budget on their behalf.
 */
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadRegistry, REGISTRY_ROOT } from '@power/agents';
import {
  compileGoal,
  createRunState,
  LocalArtifactStore,
  PowerClient,
  writeJson,
  type RunState,
} from '@power/core';
import { runGate, isStage, STAGES } from '@power/gates';
import { Runner } from './runner.js';

const ENVIRONMENT_NAME = 'power-default';

function fail(message: string): never {
  process.stderr.write(`\n  ✗ ${message}\n\n`);
  process.exit(1);
}

function requireKey(): string {
  const key = process.env['ANTHROPIC_API_KEY'];
  if (!key) {
    fail(
      'ANTHROPIC_API_KEY is not set. Power runs on the customer\'s own key — ' +
        'export it, or connect an account through the product surface.',
    );
  }
  return key;
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}

async function commandSync(): Promise<void> {
  const { agents, orphanSections } = loadRegistry(REGISTRY_ROOT);
  if (orphanSections.length > 0) {
    fail(`orphan section(s): ${orphanSections.join(', ')}. Fix the registry before syncing.`);
  }

  const client = new PowerClient({ apiKey: requireKey() });
  process.stdout.write(`  syncing ${agents.length} agents…\n`);
  const synced = await client.syncAgents(agents);

  for (const agent of synced) {
    process.stdout.write(`    ${agent.name.padEnd(22)} ${agent.id}  v${agent.version}\n`);
  }
  process.stdout.write(`\n  ✓ synced ${synced.length} agents\n`);
}

async function commandRun(args: string[]): Promise<void> {
  const goal = args.find((arg) => !arg.startsWith('--'));
  if (!goal) fail('usage: cli.ts run "<goal>" [--repo <url>] [--branch <name>] [--out <dir>]');

  const client = new PowerClient({ apiKey: requireKey() });
  const traceId = randomUUID();
  const compiled = compileGoal({ goal, traceId });

  const outDir = flag(args, 'out') ?? join(process.cwd(), '.power', traceId);
  await mkdir(outDir, { recursive: true });
  const local = new LocalArtifactStore(outDir);
  await writeJson(local, 'power_orchestrator', 'brief.json', compiled.brief);

  const { agents } = loadRegistry(REGISTRY_ROOT);
  const coordinator = agents.find((agent) => agent.delegates_to.length > 0);
  if (!coordinator) fail('no coordinator in the registry — nothing to run.');

  process.stdout.write(`  trace ${traceId}\n  syncing registry…\n`);
  const synced = await client.syncAgents(agents);
  const coordinatorRecord = synced.find((a) => a.name === coordinator.name);
  if (!coordinatorRecord) fail(`coordinator ${coordinator.name} did not sync`);

  const environmentId = await client.ensureEnvironment({ name: ENVIRONMENT_NAME });
  const memoryStoreId = await client.createMemoryStore(
    `power-run-${traceId.slice(0, 8)}`,
    'Artifact bus for one Power run: brief, research, spec, review, tests, verification.',
  );

  const repo = flag(args, 'repo');
  const githubToken = process.env['GITHUB_TOKEN'];
  if (repo && !githubToken) fail('--repo needs GITHUB_TOKEN in the environment.');

  const session = await client.startRun({
    coordinatorId: coordinatorRecord.id,
    coordinatorVersion: coordinatorRecord.version,
    environmentId,
    memoryStoreId,
    title: goal.slice(0, 80),
    outcome: {
      description: compiled.outcomeDescription,
      rubric: compiled.rubric,
      maxIterations: 5,
    },
    ...(repo && githubToken
      ? {
          repository: {
            url: repo,
            authorizationToken: githubToken,
            ...(flag(args, 'branch') ? { branch: flag(args, 'branch')! } : {}),
          },
        }
      : {}),
  });

  process.stdout.write(
    `  session ${session.id} (${session.status})\n` +
      `  trace: https://platform.claude.com/workspaces/default/sessions/${session.id}\n\n`,
  );

  const statePath = join(outDir, 'state.json');
  const persist = async (state: RunState): Promise<void> => {
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  };

  const initialState = createRunState(traceId);
  await persist(initialState);

  const runner = new Runner({
    client,
    sessionId: session.id,
    memoryStoreId,
    initialState,
    onState: persist,
    onLog: (line) => process.stdout.write(`    ${line}\n`),
  });

  const outcome = await runner.run();

  process.stdout.write(
    `\n  ${outcome.state.phase === 'done' ? '✓' : '•'} run ${outcome.state.phase} ` +
      `(${outcome.stoppedBecause}, ${outcome.eventsSeen} events)\n` +
      `  artifacts: ${outDir}\n`,
  );

  if (outcome.state.phase === 'blocked') {
    process.stdout.write(`  blocked: ${outcome.state.blocked_reason}\n`);
    process.exit(1);
  }
}

async function commandGate(args: string[]): Promise<void> {
  const [stage, directory] = args;
  if (!stage || !directory) fail(`usage: cli.ts gate <${STAGES.join('|')}> <dir>`);
  if (!isStage(stage)) fail(`unknown stage \`${stage}\`. Known: ${STAGES.join(', ')}`);

  const store = new LocalArtifactStore(directory);
  const artifacts = await store.readAll();
  const result = runGate(stage, artifacts);

  if (result.pass) {
    process.stdout.write(`  ✓ ${stage} gate passed\n`);
    return;
  }
  process.stdout.write(`  ✗ ${stage} gate failed (${result.errors.length})\n\n`);
  for (const error of result.errors) {
    process.stdout.write(`    ${error.artifact} · ${error.field} · ${error.rule}\n`);
    process.stdout.write(`      ${error.detail}\n\n`);
  }
  process.exit(1);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'sync':
      return commandSync();
    case 'run':
      return commandRun(args);
    case 'gate':
      return commandGate(args);
    default:
      fail('usage: cli.ts <sync|run|gate> [args]');
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
