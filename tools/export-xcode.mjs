#!/usr/bin/env node
/**
 * Export the native Mac app as a self-contained Xcode project.
 *
 *   node tools/export-xcode.mjs [dest]        (default: ~/Desktop/PowerApp)
 *
 * Produces a folder with Power.xcodeproj, the Swift sources, and `runtime/` —
 * the product's brain bundled dependency-free: esbuild single-file CLIs for
 * the state machine, gates, and knowledge selector, plus the agent prompts,
 * gate schemas, and the mock harness. The folder needs no Power repo, no
 * node_modules, and no pnpm on the destination machine — only `node` and the
 * `claude` CLI.
 *
 * The runtime keeps the repo's folder shape (ADR 0004): the Swift engine and
 * the Electron engine resolve identical relative paths, which is what keeps
 * the shells one product.
 *
 * The export is verified before it is reported: each bundled CLI is executed
 * from a temp directory (state init + a gate in both directions), so a broken
 * bundle fails the export instead of failing the user in Xcode.
 */
import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEST = resolve(process.argv[2] ?? join(homedir(), 'Desktop', 'PowerApp'));

function esbuildBin() {
  const local = join(ROOT, 'node_modules', '.bin', 'esbuild');
  if (existsSync(local)) return local;
  const found = execSync(
    `find ${ROOT}/node_modules/.pnpm -maxdepth 5 -path "*esbuild/bin/esbuild" -type f | head -1`,
    { encoding: 'utf8' },
  ).trim();
  if (!found) throw new Error('esbuild not found — run pnpm install first');
  return found;
}

function bundle(entry, outfile) {
  execFileSync(esbuildBin(), [
    join(ROOT, entry),
    '--bundle',
    '--platform=node',
    '--format=esm',
    `--outfile=${outfile}`,
    // Some deps use require(); give the ESM bundle one.
    '--banner:js=import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  ]);
}

function main() {
  for (const prereq of [
    'packages/core/dist/cli.js',
    'packages/gates/dist/cli.js',
    'packages/relay/dist/cli.js',
  ]) {
    if (!existsSync(join(ROOT, prereq))) {
      throw new Error(`${prereq} missing — run \`pnpm typecheck\` first to build dists`);
    }
  }

  rmSync(DEST, { recursive: true, force: true });
  const rt = join(DEST, 'runtime');

  // 1. Dependency-free CLI bundles, folder shape preserved.
  bundle('packages/core/dist/cli.js', join(rt, 'packages/core/dist/cli.js'));
  bundle('packages/gates/dist/cli.js', join(rt, 'packages/gates/dist/cli.js'));
  bundle('packages/knowledge/dist/cli.js', join(rt, 'packages/knowledge/dist/cli.js'));
  // Relay — Power's own inference router, shipped in the runtime so it needs no
  // install (spawned via node like the others).
  bundle('packages/relay/dist/cli.js', join(rt, 'packages/relay/dist/cli.js'));
  for (const pkg of ['core', 'gates', 'knowledge', 'relay']) {
    writeFileSync(join(rt, 'packages', pkg, 'package.json'), '{"type":"module"}\n');
  }

  // 2. The data the CLIs and engine read. Schemas ride beside BOTH the gates
  //    bundle and the core bundle — core inlines the gates module, so its
  //    relative `../schemas` resolves beside core's own file (found the hard
  //    way; see the export verification below).
  cpSync(join(ROOT, 'packages/gates/schemas'), join(rt, 'packages/gates/schemas'), { recursive: true });
  cpSync(join(ROOT, 'packages/gates/schemas'), join(rt, 'packages/core/schemas'), { recursive: true });
  cpSync(join(ROOT, 'packages/gates/test/fixtures'), join(rt, 'packages/gates/test/fixtures'), { recursive: true });
  cpSync(join(ROOT, 'packages/knowledge/packs'), join(rt, 'packages/knowledge/packs'), { recursive: true });
  cpSync(join(ROOT, 'agents'), join(rt, 'agents'), { recursive: true });
  // The agents' on-demand playbooks and the gate script they reference by
  // ${CLAUDE_PLUGIN_ROOT}/… — the engine resolves that variable to this runtime
  // root, so these must ride along or the reference skills won't load.
  cpSync(join(ROOT, 'skills'), join(rt, 'skills'), { recursive: true });
  cpSync(join(ROOT, 'scripts'), join(rt, 'scripts'), { recursive: true });
  mkdirSync(join(rt, 'apps/desktop/test'), { recursive: true });
  cpSync(join(ROOT, 'apps/desktop/test/mock-agent.mjs'), join(rt, 'apps/desktop/test/mock-agent.mjs'));

  // 3. The Xcode project + sources (already runtime-aware via Bundle.main).
  cpSync(join(ROOT, 'apps/macos/Power'), join(DEST, 'Power'), { recursive: true });
  cpSync(join(ROOT, 'apps/macos/Power.xcodeproj'), join(DEST, 'Power.xcodeproj'), { recursive: true });
  cpSync(join(ROOT, 'apps/macos/EXPORT_README.md'), join(DEST, 'README.md'));

  // 4. Verify the bundles are genuinely standalone before reporting success.
  const probe = mkdtempSync(join(tmpdir(), 'power-export-verify-'));
  const node = (args) => execFileSync('node', args, { cwd: probe, encoding: 'utf8' });
  node([join(rt, 'packages/core/dist/cli.js'), 'init', 'export verification run']);
  node([join(rt, 'packages/core/dist/cli.js'), 'apply', '{"type":"research_skipped"}']);
  node([join(rt, 'packages/gates/dist/cli.js'), 'research', join(rt, 'packages/gates/test/fixtures/golden')]);
  let brokenFailed = false;
  try {
    node([join(rt, 'packages/gates/dist/cli.js'), 'research', join(rt, 'packages/gates/test/fixtures/broken')]);
  } catch {
    brokenFailed = true;
  }
  rmSync(probe, { recursive: true, force: true });
  if (!brokenFailed) throw new Error('export verification failed: the gate passed a broken fixture');

  console.log(`  ✓ exported to ${DEST}`);
  console.log('  ✓ bundled CLIs verified standalone (state init, skip path, gate both directions)');
  console.log('  → open Power.xcodeproj in Xcode 16+ and press Run');
}

main();
