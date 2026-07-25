#!/usr/bin/env tsx
/**
 * Registry CLI. `validate` is the required CI check — it exits non-zero on any
 * structural problem, including ones `prompts 2` merely warns about.
 */
import { loadRegistry, REGISTRY_ROOT, RegistryError } from './registry.js';

function fail(message: string): never {
  process.stderr.write(`\n  ✗ ${message}\n\n`);
  process.exit(1);
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);
  const allowOrphans = args.includes('--allow-orphans');

  let registry;
  try {
    registry = loadRegistry(REGISTRY_ROOT);
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

    default:
      fail('usage: cli.ts <validate|list|render> [args]');
  }
}

main();
