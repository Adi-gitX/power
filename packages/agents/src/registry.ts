import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { render, RenderError } from './render.js';
import {
  ALLOWED_MODELS,
  type AgentSource,
  type ModelId,
  type RegistryFile,
  type RenderedAgent,
  type ResolvedAgent,
} from './types.js';

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

function readYaml<T>(path: string): T {
  try {
    return parseYaml(readFileSync(path, 'utf8')) as T;
  } catch (cause) {
    throw new RegistryError(`${path}: ${(cause as Error).message}`);
  }
}

/**
 * Overlay `child` onto `parent`. Objects merge key-wise; arrays and scalars are
 * replaced wholesale. Array-replace matches the Managed Agents update semantics,
 * so the mental model is the same in both places.
 */
function overlay(parent: AgentSource, child: AgentSource): AgentSource {
  const merged: Record<string, unknown> = { ...parent };
  for (const [key, value] of Object.entries(child)) {
    if (value === undefined) continue;
    const existing = merged[key];
    const bothPlainObjects =
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value);
    merged[key] = bothPlainObjects
      ? { ...(existing as object), ...(value as object) }
      : value;
  }
  delete merged['extends'];
  return merged as AgentSource;
}

function resolveExtends(
  id: string,
  sources: Map<string, AgentSource>,
  stack: readonly string[] = [],
): AgentSource {
  const source = sources.get(id);
  if (!source) {
    throw new RegistryError(
      `unknown agent definition \`${id}\`${stack.length ? ` (extended from ${stack.join(' -> ')})` : ''}`,
    );
  }
  if (stack.includes(id)) {
    throw new RegistryError(`extends cycle: ${[...stack, id].join(' -> ')}`);
  }
  if (!source.extends) return source;
  const parent = resolveExtends(source.extends, sources, [...stack, id]);
  return overlay(parent, source);
}

function assertComplete(id: string, source: AgentSource): ResolvedAgent {
  const missing = (['name', 'description', 'model', 'template'] as const).filter(
    (field) => source[field] === undefined,
  );
  if (missing.length > 0) {
    throw new RegistryError(`${id}: missing required field(s): ${missing.join(', ')}`);
  }

  const model = source.model!;
  if (!(ALLOWED_MODELS as readonly string[]).includes(model.id)) {
    throw new RegistryError(
      `${id}: model \`${model.id}\` is not in the allowlist (${ALLOWED_MODELS.join(', ')})`,
    );
  }
  if (model.effort !== undefined && !EFFORTS.has(model.effort)) {
    throw new RegistryError(`${id}: unknown effort \`${model.effort}\``);
  }

  return {
    name: source.name!,
    description: source.description!,
    model,
    template: source.template!,
    runtime_variables: source.runtime_variables ?? [],
    tools: source.tools ?? [],
    mcp_servers: source.mcp_servers ?? [],
    delegates_to: source.delegates_to ?? [],
  };
}

export interface LoadedRegistry {
  agents: RenderedAgent[];
  /** Section names registered but never referenced by any rendered prompt. */
  orphanSections: string[];
}

/**
 * Load, resolve, and render every agent definition under `root`.
 *
 * Throws on the first structural problem. A missing template file, a dead
 * section reference, an unknown model, or an unresolved placeholder all fail
 * here rather than being warned about and shipped.
 */
export function loadRegistry(root: string): LoadedRegistry {
  const registryDir = join(root, 'registry');
  const promptsDir = join(root, 'prompts');

  if (!existsSync(registryDir)) {
    throw new RegistryError(`no registry directory at ${registryDir}`);
  }

  const variables = readYaml<{ variables?: Record<string, string> }>(
    join(root, 'variables.yaml'),
  ).variables ?? {};

  const sectionsFile = readYaml<RegistryFile>(join(root, 'sections.yaml'));
  const sectionSources = sectionsFile.sections ?? {};

  const sections: Record<string, string> = {};
  const sectionRuntimeVariables: Record<string, string[]> = {};
  for (const [name, section] of Object.entries(sectionSources)) {
    const path = join(promptsDir, section.template);
    if (!existsSync(path)) {
      throw new RegistryError(
        `sections.yaml: section \`${name}\` points at missing template \`${section.template}\``,
      );
    }
    sections[name] = readFileSync(path, 'utf8');
    sectionRuntimeVariables[name] = section.runtime_variables ?? [];
  }

  const sources = new Map<string, AgentSource>();
  const files = readdirSync(registryDir).filter((f) => f.endsWith('.agent.yaml')).sort();
  for (const file of files) {
    const id = file.replace(/\.agent\.yaml$/, '');
    sources.set(id, readYaml<AgentSource>(join(registryDir, file)));
  }

  const agentTemplates: string[] = [];
  const agents: RenderedAgent[] = [];
  const seenNames = new Map<string, string>();

  for (const [id, source] of sources) {
    if (source.abstract) continue;

    const resolved = assertComplete(id, resolveExtends(id, sources));

    const previous = seenNames.get(resolved.name);
    if (previous) {
      throw new RegistryError(
        `duplicate agent name \`${resolved.name}\` in ${previous}.agent.yaml and ${id}.agent.yaml`,
      );
    }
    seenNames.set(resolved.name, id);

    const templatePath = join(promptsDir, resolved.template);
    if (!existsSync(templatePath)) {
      throw new RegistryError(
        `${id}.agent.yaml: template \`${resolved.template}\` does not exist at ${templatePath}`,
      );
    }
    const templateText = readFileSync(templatePath, 'utf8');

    // A section's own runtime placeholders become the including agent's, so an
    // agent that pulls in a section does not have to restate its variables.
    const inheritedRuntime = Object.entries(sectionRuntimeVariables)
      .filter(([name]) => templateText.includes(`{${name}}`))
      .flatMap(([, vars]) => vars);

    let system: string;
    try {
      system = render({
        text: templateText,
        variables,
        sections,
        runtimeVariables: [...resolved.runtime_variables, ...inheritedRuntime],
        origin: `${resolved.template}`,
      });
    } catch (cause) {
      if (cause instanceof RenderError) throw new RegistryError(cause.message);
      throw cause;
    }

    agentTemplates.push(templateText);
    agents.push({ ...resolved, system });
  }

  for (const agent of agents) {
    for (const delegate of agent.delegates_to) {
      if (!seenNames.has(delegate)) {
        throw new RegistryError(
          `${agent.name}: delegates_to references unknown agent \`${delegate}\``,
        );
      }
    }
    if (agent.delegates_to.length > 20) {
      throw new RegistryError(
        `${agent.name}: Managed Agents allows at most 20 roster agents, got ${agent.delegates_to.length}`,
      );
    }
  }

  // Walk transitively: a section reached only through another section is still used.
  const usedSections = new Set<string>();
  const queue = [...agentTemplates];
  while (queue.length > 0) {
    const text = queue.pop()!;
    for (const name of Object.keys(sections)) {
      if (usedSections.has(name) || !text.includes(`{${name}}`)) continue;
      usedSections.add(name);
      queue.push(sections[name]!);
    }
  }
  const orphanSections = Object.keys(sections).filter((name) => !usedSections.has(name));

  return { agents, orphanSections };
}

export const REGISTRY_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export type { ModelId };
