import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadRegistry, RegistryError } from '../src/registry.js';

const created: string[] = [];

afterEach(() => {
  while (created.length > 0) rmSync(created.pop()!, { recursive: true, force: true });
});

/** Build a throwaway registry on disk. Paths are relative to the registry root. */
function makeRegistry(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'power-registry-'));
  created.push(root);
  // One file per profile: the loader reads them all so it can enforce key parity
  // across profiles, not just load the one it was asked for.
  const defaults: Record<string, string> = {
    'variables.cma.yaml': 'variables: {}\n',
    'variables.plugin.yaml': 'variables: {}\n',
    'sections.yaml': 'sections: {}\n',
  };
  for (const [path, content] of Object.entries({ ...defaults, ...files })) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

const AGENT = `
name: solo
description: a solo agent
template: solo.md
model:
  id: claude-opus-5
  effort: high
`;

describe('extends overlays', () => {
  it('merges objects key-wise and replaces arrays wholesale', () => {
    const root = makeRegistry({
      'prompts/child.md': 'body',
      'registry/_base.agent.yaml': `
abstract: true
description: base description
model:
  id: claude-opus-5
  effort: high
tools:
  - { type: from_base }
`,
      'registry/child.agent.yaml': `
extends: _base
name: child
template: child.md
model:
  effort: xhigh
tools:
  - { type: from_child }
`,
    });

    const { agents } = loadRegistry(root);
    expect(agents).toHaveLength(1);
    const child = agents[0]!;

    // Object: the base's `id` survives, the child's `effort` wins.
    expect(child.model).toEqual({ id: 'claude-opus-5', effort: 'xhigh' });
    // Scalar: inherited when the child is silent.
    expect(child.description).toBe('base description');
    // Array: replaced, not concatenated.
    expect(child.tools).toEqual([{ type: 'from_child' }]);
  });

  it('never emits an abstract definition', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body',
      'registry/_base.agent.yaml': 'abstract: true\nmodel:\n  id: claude-opus-5\n',
      'registry/solo.agent.yaml': `extends: _base\n${AGENT}`,
    });
    expect(loadRegistry(root).agents.map((a) => a.name)).toEqual(['solo']);
  });

  it('reports an extends cycle with its path', () => {
    const root = makeRegistry({
      'prompts/a.md': 'x',
      'registry/a.agent.yaml': 'extends: b\nname: a\ndescription: d\ntemplate: a.md\nmodel: { id: claude-opus-5 }\n',
      'registry/b.agent.yaml': 'extends: a\nname: b\ndescription: d\ntemplate: a.md\nmodel: { id: claude-opus-5 }\n',
    });
    expect(() => loadRegistry(root)).toThrow(/extends cycle/);
  });

  it('rejects extending a definition that does not exist', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/solo.agent.yaml': `extends: ghost\n${AGENT}`,
    });
    expect(() => loadRegistry(root)).toThrow(/unknown agent definition `ghost`/);
  });
});

describe('hard failures that prompts 2 only warns about', () => {
  // Nine registered prompts in `prompts 2` point at files that do not exist;
  // the parser warns and skips, so they survived in the registry indefinitely.
  it('fails when a template file is missing', () => {
    const root = makeRegistry({ 'registry/solo.agent.yaml': AGENT });
    expect(() => loadRegistry(root)).toThrow(/template `solo.md` does not exist/);
  });

  it('fails when a section points at a missing template', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'sections.yaml': 'sections:\n  ghost:\n    template: sections/ghost.md\n',
      'registry/solo.agent.yaml': AGENT,
    });
    expect(() => loadRegistry(root)).toThrow(/section `ghost` points at missing template/);
  });

  it('fails on a model outside the allowlist', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/solo.agent.yaml': AGENT.replace('claude-opus-5', 'claude-opus-4-8'),
    });
    expect(() => loadRegistry(root)).toThrow(/is not in the allowlist/);
  });

  // `prompts 2` ships model strings with stray whitespace because nothing
  // validates them.
  it('fails on a model string with stray whitespace', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/solo.agent.yaml': AGENT.replace('claude-opus-5', '" claude-opus-5"'),
    });
    expect(() => loadRegistry(root)).toThrow(/is not in the allowlist/);
  });

  it('fails on an unknown effort level', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/solo.agent.yaml': AGENT.replace('effort: high', 'effort: extreme'),
    });
    expect(() => loadRegistry(root)).toThrow(/unknown effort `extreme`/);
  });

  it('fails on a missing required field', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/solo.agent.yaml': 'name: solo\ntemplate: solo.md\nmodel: { id: claude-opus-5 }\n',
    });
    expect(() => loadRegistry(root)).toThrow(/missing required field\(s\): description/);
  });

  it('fails on two definitions claiming the same agent name', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/one.agent.yaml': AGENT,
      'registry/two.agent.yaml': AGENT,
    });
    expect(() => loadRegistry(root)).toThrow(/duplicate agent name `solo`/);
  });

  it('propagates an unresolved placeholder out of the renderer', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'hello {{undefined_var}}',
      'registry/solo.agent.yaml': AGENT,
    });
    expect(() => loadRegistry(root)).toThrow(RegistryError);
    expect(() => loadRegistry(root)).toThrow(/undefined build-time variable/);
  });
});

describe('coordinator roster', () => {
  it('rejects delegating to an agent that does not exist', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      'registry/solo.agent.yaml': `${AGENT}delegates_to: [power_ghost]\n`,
    });
    expect(() => loadRegistry(root)).toThrow(/delegates_to references unknown agent/);
  });

  it('rejects a roster larger than the Managed Agents limit of 20', () => {
    const roster = Array.from({ length: 21 }, (_, i) => `  - worker${i}`).join('\n');
    const workers = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [
        `registry/w${i}.agent.yaml`,
        `name: worker${i}\ndescription: d\ntemplate: solo.md\nmodel: { id: claude-opus-5 }\n`,
      ]),
    );
    const root = makeRegistry({
      'prompts/solo.md': 'x',
      ...workers,
      'registry/solo.agent.yaml': `${AGENT}delegates_to:\n${roster}\n`,
    });
    expect(() => loadRegistry(root)).toThrow(/at most 20 roster agents, got 21/);
  });
});

describe('orphan sections', () => {
  it('reports a section nothing includes', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body with no includes',
      'prompts/sections/lonely.md': 'nobody references me',
      'sections.yaml': 'sections:\n  lonely:\n    template: sections/lonely.md\n',
      'registry/solo.agent.yaml': AGENT,
    });
    expect(loadRegistry(root).orphanSections).toEqual(['lonely']);
  });

  it('does not flag a section reached only through another section', () => {
    const root = makeRegistry({
      'prompts/solo.md': '{outer}',
      'prompts/sections/outer.md': 'outer includes {inner}',
      'prompts/sections/inner.md': 'inner body',
      'sections.yaml':
        'sections:\n  outer:\n    template: sections/outer.md\n  inner:\n    template: sections/inner.md\n',
      'registry/solo.agent.yaml': AGENT,
    });
    const { agents, orphanSections } = loadRegistry(root);
    expect(orphanSections).toEqual([]);
    expect(agents[0]!.system).toBe('outer includes inner body');
  });
});

describe('profiles', () => {
  const PLUGIN = `
plugin:
  name: solo
  model: opus
  tools: [Read]
  core_blocks: [identity]
`;

  it('renders profile-specific variable values', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'root is {{workspace_root}}',
      'variables.cma.yaml': 'variables:\n  workspace_root: "/workspace"\n',
      'variables.plugin.yaml': 'variables:\n  workspace_root: "."\n',
      'registry/solo.agent.yaml': AGENT + PLUGIN,
    });
    expect(loadRegistry(root, 'cma').agents[0]!.system).toBe('root is /workspace');
    expect(loadRegistry(root, 'plugin').agents[0]!.system).toBe('root is .');
  });

  // Without this, a prompt could reference a variable only one profile defines,
  // render cleanly there, and break the other build — caught by whichever ran second.
  it('rejects profiles that do not declare the same variable keys', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body',
      'variables.cma.yaml': 'variables:\n  a: "1"\n  b: "2"\n',
      'variables.plugin.yaml': 'variables:\n  a: "1"\n',
      'registry/solo.agent.yaml': AGENT,
    });
    expect(() => loadRegistry(root)).toThrow(/missing: b/);
  });

  it('rejects an unknown profile', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body',
      'registry/solo.agent.yaml': AGENT,
    });
    expect(() => loadRegistry(root, 'sandbox' as never)).toThrow(/unknown profile/);
  });

  it('requires a plugin block only for the plugin profile', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body',
      'registry/solo.agent.yaml': AGENT,
    });
    expect(loadRegistry(root, 'cma').agents[0]!.plugin).toBeUndefined();
    expect(() => loadRegistry(root, 'plugin')).toThrow(/missing `plugin` block/);
  });

  it('rejects a plugin name that is not kebab-case', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body',
      'registry/solo.agent.yaml': AGENT + PLUGIN.replace('name: solo', 'name: Solo_Agent'),
    });
    expect(() => loadRegistry(root, 'plugin')).toThrow(/kebab-case/);
  });

  it('rejects two agents that would write the same agent file', () => {
    const root = makeRegistry({
      'prompts/solo.md': 'body',
      'registry/solo.agent.yaml': AGENT + PLUGIN,
      'registry/other.agent.yaml':
        AGENT.replace('name: solo', 'name: other') + PLUGIN,
    });
    expect(() => loadRegistry(root, 'plugin')).toThrow(/duplicate plugin.name/);
  });
});
