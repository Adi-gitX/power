#!/usr/bin/env tsx
/**
 * Capability pack CLI.
 *
 *   validate            structural checks; exits non-zero on any problem
 *   selector            print the generated selector section
 *   show <name>         print one pack's body
 */
import { loadPacks, PACKS_ROOT } from './registry.js';
import { renderSelector, renderTestingInstructions } from './selector.js';
import { importPlaybooks } from './import.js';
import { PackError } from './types.js';

function fail(message: string): never {
  process.stderr.write(`\n  ✗ ${message}\n\n`);
  process.exit(1);
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);

  // Import runs before loading: it writes the packs the loader then validates.
  if (command === 'import') {
    const source = args[0];
    if (!source) fail('usage: cli.ts import <path-to-prompts-repo>');
    let result;
    try {
      result = importPlaybooks(source, PACKS_ROOT);
    } catch (error) {
      if (error instanceof PackError) fail(error.message);
      throw error;
    }
    process.stdout.write(
      `  ✓ imported ${result.written} packs ` +
        `(${result.enabled} enabled, ${result.disabledPlatformBound.length} platform-bound ` +
        `disabled, ${result.designPacks} design)\n`,
    );
    if (result.disabledPlatformBound.length > 0) {
      process.stdout.write(
        `    disabled: ${result.disabledPlatformBound.join(', ')}\n` +
          `    each needs its platform-specific instructions adapted before enabling\n`,
      );
    }
    if (result.skippedEmpty.length > 0) {
      process.stdout.write(
        `    skipped as effectively empty: ${result.skippedEmpty.join('; ')}\n`,
      );
    }
    // Fall through to a full validation of what was just written.
    try {
      loadPacks(PACKS_ROOT);
      process.stdout.write(`  ✓ imported packs validate\n`);
    } catch (error) {
      if (error instanceof PackError) fail(`import wrote invalid packs: ${error.message}`);
      throw error;
    }
    return;
  }

  let loaded;
  try {
    loaded = loadPacks(PACKS_ROOT);
  } catch (error) {
    if (error instanceof PackError) fail(error.message);
    throw error;
  }

  switch (command) {
    case 'validate': {
      if (loaded.orphanFiles.length > 0) {
        fail(
          `pack body file(s) no definition references: ${loaded.orphanFiles.join(', ')}. ` +
            `Register them or delete them — an unregistered body is maintained and never shipped.`,
        );
      }
      const live = loaded.packs.filter((pack) => pack.enabled).length;
      process.stdout.write(
        `  ✓ ${loaded.packs.length} packs (${live} enabled), all bodies, categories and ` +
          `deprecations resolved\n`,
      );
      return;
    }

    case 'selector':
      process.stdout.write(renderSelector(loaded.packs));
      process.stdout.write(renderTestingInstructions(loaded.packs));
      return;

    case 'show': {
      const name = args[0];
      if (!name) fail('usage: cli.ts show <pack-name>');
      const pack = loaded.packs.find((candidate) => candidate.name === name);
      if (!pack) {
        fail(`unknown pack \`${name}\`. Known: ${loaded.packs.map((p) => p.name).join(', ')}`);
      }
      process.stdout.write(pack.body);
      return;
    }

    default:
      fail('usage: cli.ts <validate|selector|show> [args]');
  }
}

main();
