#!/usr/bin/env tsx
/**
 * Registry CLI. `validate` is the required CI check — it exits non-zero on any
 * structural problem, including ones `prompts 2` merely warns about.
 */
import { resolve } from 'node:path';
import { loadRegistry, REGISTRY_ROOT, RegistryError } from './registry.js';
import { build, writeBuild, verifyPointers, BuildError } from './build.js';
import { PROFILES, type Profile } from './types.js';

function fail(message: string): never {
  process.stderr.write(`\n  ✗ ${message}\n\n`);
  process.exit(1);
}

/** Read `--flag value`, falling back to a default. */
function flag(args: readonly string[], name: string, fallback: string): string {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) fail(`--${name} needs a value`);
  return value;
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);
  const allowOrphans = args.includes('--allow-orphans');

  const profile = flag(args, 'profile', 'cma');
  if (!(PROFILES as readonly string[]).includes(profile)) {
    fail(`unknown --profile \`${profile}\`. Known: ${PROFILES.join(', ')}`);
  }

  let registry;
  try {
    registry = loadRegistry(REGISTRY_ROOT, profile as Profile);
  } catch (error) {
    if (error instanceof RegistryError) fail(error.message);
    throw error;
  }

  switch (command) {
    case 'validate': {
      if (registry.orphanSections.length > 0 && !allowOrphans) {
        fail(
          `orphan section(s) registered but never included: ${registry.orphanSections.join(', ')}. ` +
            `Remove them, reference them, or pass --allow-orphans.`,
        );
      }
      const coordinators = registry.agents.filter((a) => a.delegates_to.length > 0);
      process.stdout.write(
        `  ✓ ${registry.agents.length} agents, ${coordinators.length} coordinator(s), ` +
          `all templates, sections, models and placeholders resolved\n`,
      );
      return;
    }

    case 'list': {
      for (const agent of registry.agents) {
        const effort = agent.model.effort ? `/${agent.model.effort}` : '';
        process.stdout.write(
          `${agent.name.padEnd(22)} ${(agent.model.id + effort).padEnd(24)} ` +
            `${agent.system.length.toString().padStart(6)} chars\n`,
        );
      }
      return;
    }

    case 'render': {
      const name = args.find((a) => !a.startsWith('--'));
      if (!name) fail('usage: cli.ts render <agent-name>');
      const agent = registry.agents.find((a) => a.name === name);
      if (!agent) {
        fail(`unknown agent \`${name}\`. Known: ${registry.agents.map((a) => a.name).join(', ')}`);
      }
      process.stdout.write(agent.system + '\n');
      return;
    }

    case 'build': {
      if (profile !== 'plugin') {
        fail(`build targets the plugin profile; pass --profile plugin`);
      }
      const out = resolve(flag(args, 'out', process.cwd()));

      let output;
      try {
        output = build(registry.agents, registry.sharedSections);
      } catch (error) {
        if (error instanceof BuildError) fail(error.message);
        throw error;
      }

      // Checked before writing: a broken pointer table means an agent would be
      // installed missing part of its instructions.
      const problems = verifyPointers(output);
      if (problems.length > 0) {
        fail(`pointer table is inconsistent:\n    - ${problems.join('\n    - ')}`);
      }

      writeBuild(out, output);

      const agentCount = output.pointers.size;
      const referenceCount = output.files.length - agentCount;
      process.stdout.write(
        `  ✓ ${agentCount} agents, ${referenceCount} reference files -> ${out}\n`,
      );
      return;
    }

    default:
      fail('usage: cli.ts <validate|list|render|build> [--profile cma|plugin] [--out dir]');
  }
}

main();
