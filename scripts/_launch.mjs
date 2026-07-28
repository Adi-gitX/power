/**
 * Shared launcher for the plugin's deterministic helpers.
 *
 * The gate and the state machine are TypeScript in `packages/`, with real
 * dependencies. Reimplementing them here as dependency-free JavaScript would
 * mean two copies of the rules that decide whether a stage passed, and the copy
 * the agents actually run would be the one nothing tests. So these scripts stay
 * thin: they locate the workspace's own `tsx` and hand off.
 *
 * Design constraint worth stating: **the plugin root is the repository**, which
 * is what makes this work. `pnpm install` has already put `tsx`, `ajv`, and
 * `yaml` in `node_modules/`. If that ever stops being true — a plugin installed
 * standalone, without the workspace — this fails loudly with an instruction
 * rather than silently skipping the gate. A gate that no-ops on a broken install
 * is worse than no gate, because the run reports success.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The plugin root — one level up from `scripts/`. */
export const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function findRunner() {
  const tsx = join(PLUGIN_ROOT, 'node_modules', '.bin', 'tsx');
  if (existsSync(tsx)) return tsx;

  process.stderr.write(
    `\n  ✗ Power's helpers cannot run: no tsx in ${PLUGIN_ROOT}/node_modules/.bin/\n\n` +
      `    The gate and the state machine are real code, and Power refuses to\n` +
      `    pretend a stage passed because its checker was missing. Install the\n` +
      `    workspace once and this resolves:\n\n` +
      `        cd ${PLUGIN_ROOT} && pnpm install\n\n`,
  );
  process.exit(2);
}

/**
 * Run a TypeScript entry point under the workspace's tsx, inheriting stdio and
 * propagating its exit code. Callers get the child's exit semantics verbatim,
 * which is what lets a job recipe branch on 0 / 1 / 2 without parsing output.
 */
export function launch(entry, args) {
  const runner = findRunner();
  const script = join(PLUGIN_ROOT, entry);

  if (!existsSync(script)) {
    process.stderr.write(`\n  ✗ missing ${entry} — the plugin tree is incomplete\n\n`);
    process.exit(2);
  }

  const result = spawnSync(runner, [script, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  if (result.error) {
    process.stderr.write(`\n  ✗ could not run ${entry}: ${result.error.message}\n\n`);
    process.exit(2);
  }
  // A signalled child (OOM, Ctrl-C) has a null status; treat that as failure
  // rather than letting `null` coerce to a passing 0.
  process.exit(result.status ?? 1);
}
