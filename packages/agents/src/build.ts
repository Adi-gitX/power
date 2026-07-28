/**
 * Compile rendered prompts into a Claude Code plugin.
 *
 * Each agent becomes `agents/<name>.md` — YAML frontmatter plus the blocks the
 * registry marks as core — and every remaining block becomes a reference file
 * under `skills/power/reference/<name>/<block>.md`, linked from a pointer table
 * appended to the agent body.
 *
 * **The pointer table is generated from the split, never hand-written.** That is
 * what makes the slim-body design safe. A block cannot move out of the agent
 * without its pointer appearing in the same pass, so the failure mode of a
 * progressive-disclosure prompt — material silently dropped, with nothing left
 * to say it ever existed — cannot happen here. `verifyPointers` re-derives the
 * relationship from the emitted files and is asserted in tests.
 *
 * Output is deterministic: same registry in, byte-identical tree out, so `git
 * diff` after a rebuild is a real signal.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { RenderedAgent } from './types.js';

export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildError';
  }
}

/**
 * Matches a top-level XML block: `<name>` alone on a line through `</name>`
 * alone on a line. Prompts are authored this way throughout (per the house
 * doctrine in `Guideline.md`), which is what makes the split mechanical rather
 * than a heuristic over prose.
 */
const TOP_LEVEL_BLOCK = /^<([a-z_][a-z0-9_]*)>$\n([\s\S]*?)^<\/\1>$/gm;

export interface PromptBlock {
  name: string;
  /** The block including its enclosing tags, exactly as authored. */
  text: string;
}

/** Split a rendered prompt into its top-level blocks, in document order. */
export function splitBlocks(system: string): PromptBlock[] {
  const blocks: PromptBlock[] = [];
  for (const match of system.matchAll(TOP_LEVEL_BLOCK)) {
    blocks.push({ name: match[1]!, text: match[0]! });
  }
  return blocks;
}

/** Human-facing label for a block name: `ears_in_depth` -> `Ears in depth`. */
function label(blockName: string): string {
  const words = blockName.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface BuiltAgent {
  /** Path relative to the plugin root. */
  path: string;
  contents: string;
}

export interface BuildOutput {
  files: BuiltAgent[];
  /** `agents/<name>.md` -> reference paths it points at. */
  pointers: Map<string, string[]>;
}

const REFERENCE_DIR = 'skills/power/reference';
const AGENT_DIR = 'agents';

/**
 * YAML-quote a description for frontmatter. Descriptions are the one part of an
 * agent that always occupies main-session context, so they are emitted on a
 * single line.
 */
function quote(text: string): string {
  return `"${text.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"')}"`;
}

function buildAgent(
  agent: RenderedAgent,
  sharedSections: ReadonlySet<string>,
): { files: BuiltAgent[]; pointers: string[] } {
  const { plugin } = agent;
  if (!plugin) {
    throw new BuildError(
      `${agent.name}: no plugin config. Load the registry with the \`plugin\` profile.`,
    );
  }
  const blocks = splitBlocks(agent.system);

  if (blocks.length === 0) {
    throw new BuildError(
      `${agent.name}: no top-level <block> found in the rendered prompt. The plugin ` +
        `build splits on top-level XML blocks; a prompt without them cannot be split.`,
    );
  }

  const found = new Set(blocks.map((b) => b.name));
  const unknownCore = plugin.core_blocks.filter((name) => !found.has(name));
  if (unknownCore.length > 0) {
    throw new BuildError(
      `${agent.name}: plugin.core_blocks names block(s) that do not exist in ` +
        `${agent.template}: ${unknownCore.join(', ')}. Known blocks: ${[...found].join(', ')}`,
    );
  }
  const unknownHints = Object.keys(plugin.reference_hints ?? {}).filter(
    (name) => !found.has(name),
  );
  if (unknownHints.length > 0) {
    throw new BuildError(
      `${agent.name}: plugin.reference_hints names block(s) that do not exist in ` +
        `${agent.template}: ${unknownHints.join(', ')}`,
    );
  }
  // Shared sections are the run-wide invariants — the constitution, the artifact
  // bus, the gate protocol, the untrusted-input rules. They are inline for every
  // agent regardless of what the registry says, and deliberately not a matter of
  // per-agent configuration.
  //
  // `untrusted_input` is why this is enforced in code rather than left to eight
  // hand-written lists. It is the prompt-injection defence, and an agent reads
  // artifacts written by other agents and fetched from the web. Making that
  // defence conditional on the agent choosing to open a file would invert it:
  // the injected content would be in context while the rule about not trusting
  // it was still sitting on disk.
  const isCore = (name: string): boolean =>
    plugin.core_blocks.includes(name) || sharedSections.has(name);

  const hintedButCore = Object.keys(plugin.reference_hints ?? {}).filter(isCore);
  if (hintedButCore.length > 0) {
    throw new BuildError(
      `${agent.name}: block(s) are always inline but given a reference hint: ` +
        `${hintedButCore.join(', ')}. An inline block's hint would point at a file ` +
        `that is never written.`,
    );
  }

  const core = blocks.filter((b) => isCore(b.name));
  const reference = blocks.filter((b) => !isCore(b.name));

  const files: BuiltAgent[] = [];
  const pointers: string[] = [];

  const rows: string[] = [];
  for (const block of reference) {
    const path = `${REFERENCE_DIR}/${plugin.name}/${block.name}.md`;
    files.push({
      path,
      contents:
        `<!-- Generated from prompts/${agent.template} by \`pnpm --filter @power/agents build\`. ` +
        `Edit the prompt, not this file. -->\n\n${block.text}\n`,
    });
    pointers.push(path);

    const hint = plugin.reference_hints?.[block.name];
    rows.push(
      `- **${label(block.name)}** — \`\${CLAUDE_PLUGIN_ROOT}/${path}\`` +
        (hint ? `\n  Read ${hint}.` : ''),
    );
  }

  const frontmatter = [
    '---',
    `name: ${plugin.name}`,
    `description: ${quote(agent.description)}`,
    `model: ${plugin.model}`,
    ...(agent.model.effort ? [`effort: ${agent.model.effort}`] : []),
    `tools: ${plugin.tools.join(', ')}`,
    '---',
  ].join('\n');

  const referenceSection =
    reference.length === 0
      ? ''
      : [
          '',
          '<reference_material>',
          'The rest of your operating detail lives in files beside this one. They are',
          'part of your instructions, not background reading: when the moment described',
          'below arrives, read the file before you act, not after.',
          '',
          ...rows,
          '',
          'Read a file at most once per run — they do not change while you work.',
          '</reference_material>',
        ].join('\n');

  files.push({
    path: `${AGENT_DIR}/${plugin.name}.md`,
    contents: `${frontmatter}\n\n${core.map((b) => b.text).join('\n\n')}${referenceSection}\n`,
  });

  return { files, pointers };
}

/**
 * Compile every agent. Pure — callers decide whether to write to disk.
 *
 * `sharedSections` are the registered section names; every one of them stays
 * inline in every agent. Pass `loadRegistry(...).sharedSections`.
 */
export function build(
  agents: readonly RenderedAgent[],
  sharedSections: readonly string[],
): BuildOutput {
  const files: BuiltAgent[] = [];
  const pointers = new Map<string, string[]>();
  const shared = new Set(sharedSections);

  const ordered = [...agents].sort((a, b) =>
    (a.plugin?.name ?? a.name).localeCompare(b.plugin?.name ?? b.name),
  );
  for (const agent of ordered) {
    const result = buildAgent(agent, shared);
    files.push(...result.files);
    pointers.set(`${AGENT_DIR}/${agent.plugin!.name}.md`, result.pointers);
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, pointers };
}

/**
 * Re-derive the pointer relationship from emitted bytes.
 *
 * This deliberately does not trust the `pointers` map the build returned: it
 * reads the agent files back and checks that every reference file is pointed at
 * exactly once, and that every pointer resolves to a file that was written. A
 * bug in `buildAgent` that dropped a row would be caught here rather than
 * shipping an agent missing part of its instructions.
 */
export function verifyPointers(output: BuildOutput): string[] {
  const problems: string[] = [];
  const written = new Set(output.files.map((f) => f.path));
  const byPath = new Map(output.files.map((f) => [f.path, f.contents]));

  for (const [agentPath, expected] of output.pointers) {
    const body = byPath.get(agentPath);
    if (body === undefined) {
      problems.push(`${agentPath}: pointer table recorded but no agent file emitted`);
      continue;
    }
    for (const path of expected) {
      if (!written.has(path)) {
        problems.push(`${agentPath}: points at ${path}, which was never written`);
      }
      const occurrences = body.split(`\${CLAUDE_PLUGIN_ROOT}/${path}`).length - 1;
      if (occurrences !== 1) {
        problems.push(
          `${agentPath}: reference ${path} appears in ${occurrences} pointer(s), expected exactly 1`,
        );
      }
    }
  }

  const pointedAt = new Set([...output.pointers.values()].flat());
  for (const file of output.files) {
    if (file.path.startsWith(`${REFERENCE_DIR}/`) && !pointedAt.has(file.path)) {
      problems.push(`${file.path}: written but no agent points at it — material would be lost`);
    }
  }

  return problems;
}

/**
 * Write the build to disk, removing generated files that are no longer produced.
 *
 * Only generated trees are cleared: `agents/` and the reference directory. A
 * stale agent left behind from a renamed registry entry would otherwise stay
 * installed and dispatchable forever.
 */
export function writeBuild(root: string, output: BuildOutput): void {
  for (const dir of [AGENT_DIR, REFERENCE_DIR]) {
    const path = join(root, dir);
    if (existsSync(path)) rmSync(path, { recursive: true });
  }

  for (const file of output.files) {
    const path = join(root, file.path);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, file.contents, 'utf8');
  }
}

/** Paths under `root` that the build owns, for reporting. */
export function generatedPaths(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else out.push(rel);
    }
  };
  walk(join(root, AGENT_DIR), AGENT_DIR);
  walk(join(root, REFERENCE_DIR), REFERENCE_DIR);
  return out;
}
