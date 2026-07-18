#!/usr/bin/env tsx
/**
 * Run a gate against a directory of artifacts (normally a run's memory store).
 *
 *   tsx src/cli.ts <stage> <artifact-dir>
 *
 * Exits 0 on pass, 1 on gate failure, 2 on usage error — so it composes in CI
 * and in the orchestrator's `run_gate` tool handler alike.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runGate, type Artifacts } from './index.js';
import { isStage, STAGES } from './types.js';

const ARTIFACT_FILES = ['research.json', 'SPEC.md', 'verification.json'] as const;

function main(): void {
  const [stage, directory] = process.argv.slice(2);

  if (!stage || !directory) {
    process.stderr.write(`usage: cli.ts <${STAGES.join('|')}> <artifact-dir>\n`);
    process.exit(2);
  }
  if (!isStage(stage)) {
    process.stderr.write(`unknown stage \`${stage}\`. Known: ${STAGES.join(', ')}\n`);
    process.exit(2);
  }

  const artifacts: Artifacts = {};
  for (const file of ARTIFACT_FILES) {
    const path = join(directory, file);
    if (existsSync(path)) artifacts[file] = readFileSync(path, 'utf8');
  }

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

main();
