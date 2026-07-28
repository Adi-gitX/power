#!/usr/bin/env node
/**
 * Query the capability-pack registry.
 *
 *   node scripts/knowledge.mjs validate         structural checks
 *   node scripts/knowledge.mjs selector         the catalogue + testing instructions
 *   node scripts/knowledge.mjs show <name>      one pack's body
 *
 * The registry carries both hand-authored packs and the corpus imported from the
 * reference prompts repository (121 packs: integrations and design languages).
 * The orchestrator runs `selector` before dispatching the implementer and
 * includes matched pack bodies in the brief — see step 7 of jobs/build.md.
 *
 * `import` is deliberately not exposed here: re-importing changes the committed
 * registry, which is repo maintenance, not something a run should ever do.
 */
import { launch } from './_launch.mjs';
import { join } from 'node:path';

const [command] = process.argv.slice(2);
if (command === 'import') {
  process.stderr.write(
    'import is not available from the plugin — it rewrites the committed registry.\n' +
      'Run it from the repo: pnpm --filter @power/knowledge exec tsx src/cli.ts import <source>\n',
  );
  process.exit(2);
}

launch(join('packages', 'knowledge', 'src', 'cli.ts'), process.argv.slice(2));
