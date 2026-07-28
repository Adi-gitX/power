import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { render, RenderError } from './render.js';
import {
  ALLOWED_MODELS,
  CLAUDE_CODE_MODELS,
  PROFILES,
  type AgentSource,
  type ModelId,
  type PluginConfig,
  type Profile,
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

/**
 * Validate the `plugin` block. These checks are cheap and catch the failure that
 * matters most: a tool grant that quietly widens an agent's role. The reviewer
 * gaining `Write` would not break any test that does not look for it, so the
 * shape is checked here and the boundaries themselves are pinned in prompts.test.
 */
function assertPlugin(
  id: string,
  plugin: PluginConfig | undefined,
  profile: Profile,
): PluginConfig | undefined {
  // Only the plugin profile consumes this block, so only it insists on one. The
  // repo's own `validate` runs every profile, so a missing block is still caught
  // in CI rather than at build time.
  if (!plugin) {
    if (profile !== 'plugin') return undefined;
    throw new RegistryError(
      `${id}: missing \`plugin\` block. Every concrete agent needs one — it carries ` +
        `the Claude Code name, tool grants, model alias, and core-block split.`,
    );
  }
  for (const field of ['name', 'model'] as const) {
    if (typeof plugin[field] !== 'string' || plugin[field].length === 0) {
      throw new RegistryError(`${id}: plugin.${field} must be a non-empty string`);
    }
  }
  if (!/^[a-z][a-z0-9-]*$/.test(plugin.name)) {
    throw new RegistryError(
      `${id}: plugin.name \`${plugin.name}\` must be lowercase kebab-case — it becomes ` +
        `both the \`power:<name>\` address and the \`agents/<name>.md\` filename.`,
    );
  }
  if (!(CLAUDE_CODE_MODELS as readonly string[]).includes(plugin.model)) {
    throw new RegistryError(
      `${id}: plugin.model \`${plugin.model}\` is not one of ${CLAUDE_CODE_MODELS.join(', ')}`,
    );
  }
  for (const field of ['tools', 'core_blocks'] as const) {
    if (!Array.isArray(plugin[field]) || plugin[field].length === 0) {
      throw new RegistryError(`${id}: plugin.${field} must be a non-empty array`);
    }
  }
  return {
    ...plugin,
    reference_hints: plugin.reference_hints ?? {},
  };
}

function assertComplete(id: string, source: AgentSource, profile: Profile): ResolvedAgent {
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
    plugin: assertPlugin(id, source.plugin, profile),
  };
}

/**
 * Load both profiles' variable files and return the requested one.
 *
 * Key parity is enforced across profiles rather than merely documented: if
 * `plugin` defined a variable `cma` lacked, a prompt could reference it, render
 * cleanly for the plugin, and fail the CMA build — a break discovered only by
 * whichever build ran second.
 */
function loadVariables(root: string, profile: Profile): Record<string, string> {
  const byProfile = new Map<Profile, Record<string, string>>();
  for (const name of PROFILES) {
    const path = join(root, `variables.${name}.yaml`);
    if (!existsSync(path)) {
      throw new RegistryError(`no variables file for profile \`${name}\` at ${path}`);
    }
    byProfile.set(name, readYaml<{ variables?: Record<string, string> }>(path).variables ?? {});
  }

  const [first, ...rest] = PROFILES;
  const expected = Object.keys(byProfile.get(first!)!).sort();
  for (const name of rest) {
    const actual = Object.keys(byProfile.get(name)!).sort();
    const missing = expected.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !expected.includes(k));
    if (missing.length > 0 || extra.length > 0) {
      throw new RegistryError(
        `variables.${name}.yaml does not declare the same keys as variables.${first}.yaml` +
          (missing.length ? `; missing: ${missing.join(', ')}` : '') +
          (extra.length ? `; unexpected: ${extra.join(', ')}` : '') +
          `. Every profile must define every variable, or a prompt renders under ` +
          `one profile and fails under another.`,
      );
    }
  }

  return byProfile.get(profile)!;
}

export interface LoadedRegistry {
  agents: RenderedAgent[];
  /** Section names registered but never referenced by any rendered prompt. */
  orphanSections: string[];
  /** Every registered section name — the run-wide invariants shared by agents. */
  sharedSections: string[];
  /** The profile these agents were rendered for. */
  profile: Profile;
}

/**
 * Load, resolve, and render every agent definition under `root` for one profile.
 *
 * Throws on the first structural problem. A missing template file, a dead
 * section reference, an unknown model, or an unresolved placeholder all fail
 * here rather than being warned about and shipped.
 */
export function loadRegistry(root: string, profile: Profile = 'cma'): LoadedRegistry {
  const registryDir = join(root, 'registry');
  const promptsDir = join(root, 'prompts');

  if (!existsSync(registryDir)) {
    throw new RegistryError(`no registry directory at ${registryDir}`);
  }
  if (!(PROFILES as readonly string[]).includes(profile)) {
    throw new RegistryError(
      `unknown profile \`${profile}\`. Known: ${PROFILES.join(', ')}`,
    );
  }

  const variables = loadVariables(root, profile);

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

    const resolved = assertComplete(id, resolveExtends(id, sources), profile);

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

  const seenPluginNames = new Map<string, string>();
  for (const agent of agents) {
    if (!agent.plugin) continue;
    const previous = seenPluginNames.get(agent.plugin.name);
    if (previous) {
      throw new RegistryError(
        `duplicate plugin.name \`${agent.plugin.name}\` on ${previous} and ${agent.name} — ` +
          `both would be written to agents/${agent.plugin.name}.md`,
      );
    }
    seenPluginNames.set(agent.plugin.name, agent.name);
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

  return {
    agents,
    orphanSections,
    sharedSections: Object.keys(sections).sort(),
    profile,
  };
}

export const REGISTRY_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export type { ModelId };
