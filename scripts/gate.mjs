#!/usr/bin/env node
/**
 * Run a stage gate.
 *
 *   node scripts/gate.mjs <research|spec|verification> [artifact-dir]
 *
 * `artifact-dir` defaults to `.power/artifacts`, which is where a Power run puts
 * everything, so the common call is just `gate.mjs research`.
 *
 * Exit 0 = passed, 1 = failed (with the specific rule violations on stdout),
 * 2 = usage or environment problem.
 *
 * This is the one thing in the pipeline an agent cannot talk its way past. It
 * runs in the session, as code, over the bytes on disk — not as a question put
 * to a model about whether its own work was good enough.
 */
import { launch, PLUGIN_ROOT } from './_launch.mjs';
import { join } from 'node:path';

const [stage, directory] = process.argv.slice(2);

if (!stage) {
  process.stderr.write(
    `usage: gate.mjs <research|spec|verification> [artifact-dir]\n` +
      `       artifact-dir defaults to .power/artifacts\n`,
  );
  process.exit(2);
}

launch(join('packages', 'gates', 'src', 'cli.ts'), [
  stage,
  directory ?? join(process.cwd(), '.power', 'artifacts'),
]);

// `launch` never returns; referenced so the import is not mistaken for unused.
void PLUGIN_ROOT;
