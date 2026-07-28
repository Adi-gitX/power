import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry, REGISTRY_ROOT } from '../src/registry.js';
import { build, splitBlocks, verifyPointers, BuildError } from '../src/build.js';
import type { RenderedAgent } from '../src/types.js';

/** Repository root — the plugin root, two levels up from `packages/agents`. */
const PLUGIN_ROOT = join(REGISTRY_ROOT, '..', '..');

const registry = loadRegistry(REGISTRY_ROOT, 'plugin');
const output = build(registry.agents, registry.sharedSections);
const byPath = new Map(output.files.map((f) => [f.path, f.contents]));
const agentPaths = [...output.pointers.keys()];

function frontmatter(path: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(byPath.get(path)!);
  expect(match, `${path} has no frontmatter`).toBeTruthy();
  return Object.fromEntries(
    match![1]!.split('\n').map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
  );
}

/** A minimal agent, for the error paths that the real registry cannot reach. */
function fixture(overrides: Partial<RenderedAgent> = {}): RenderedAgent {
  return {
    name: 'power_fixture',
    description: 'A fixture.',
    model: { id: 'claude-opus-5', effort: 'high' },
    template: 'fixture.md',
    runtime_variables: [],
    tools: [],
    mcp_servers: [],
    delegates_to: [],
    plugin: {
      name: 'fixture',
      model: 'opus',
      tools: ['Read'],
      core_blocks: ['identity'],
      reference_hints: {},
    },
    system: '<identity>\nI am a fixture.\n</identity>\n\n<extra>\nMore.\n</extra>',
    ...overrides,
  };
}

describe('splitBlocks', () => {
  it('finds top-level blocks in document order', () => {
    const blocks = splitBlocks('<a>\nfirst\n</a>\n\n<b>\nsecond\n</b>');
    expect(blocks.map((b) => b.name)).toEqual(['a', 'b']);
  });

  it('keeps the enclosing tags, so a block round-trips verbatim', () => {
    expect(splitBlocks('<a>\nbody\n</a>')[0]!.text).toBe('<a>\nbody\n</a>');
  });

  it('does not treat an indented tag as a top-level block', () => {
    const blocks = splitBlocks('<outer>\n  <inner>\n  x\n  </inner>\n</outer>');
    expect(blocks.map((b) => b.name)).toEqual(['outer']);
  });

  it('does not pair tags with different names', () => {
    expect(splitBlocks('<a>\nbody\n</b>')).toEqual([]);
  });
});

describe('the emitted plugin tree', () => {
  it('writes one file per agent', () => {
    expect(agentPaths.sort()).toEqual([
      'agents/architect.md',
      'agents/documenter.md',
      'agents/implementer.md',
      'agents/orchestrator.md',
      'agents/researcher.md',
      'agents/reviewer.md',
      'agents/tester.md',
      'agents/verifier.md',
    ]);
  });

  it.each(agentPaths.map((p) => [p] as const))('%s has well-formed frontmatter', (path) => {
    const fields = frontmatter(path);
    expect(Object.keys(fields)).toEqual(
      expect.arrayContaining(['name', 'description', 'model', 'tools']),
    );
    expect(fields['name']).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it.each(agentPaths.map((p) => [p] as const))(
    '%s keeps its description to a single line',
    (path) => {
      // The description is the one part of an agent always resident in the main
      // session's context; a stray newline would also break the frontmatter.
      expect(frontmatter(path)['description']).toMatch(/^".*"$/);
    },
  );

  it('emits deterministic output — same registry in, identical bytes out', () => {
    const again = build(registry.agents, registry.sharedSections);
    expect(again.files).toEqual(output.files);
  });
});

describe('the generated pointer table', () => {
  it('is internally consistent', () => {
    expect(verifyPointers(output)).toEqual([]);
  });

  it('points at every reference file exactly once', () => {
    const referenceFiles = output.files
      .map((f) => f.path)
      .filter((p) => p.startsWith('skills/power/reference/'));
    const pointedAt = [...output.pointers.values()].flat();
    expect(pointedAt.sort()).toEqual(referenceFiles.sort());
  });

  it('catches a reference file that nothing points at', () => {
    const broken = {
      files: [...output.files, { path: 'skills/power/reference/verifier/orphan.md', contents: '' }],
      pointers: output.pointers,
    };
    expect(verifyPointers(broken).join()).toContain('material would be lost');
  });

  it('catches a pointer whose file was never written', () => {
    const [first] = agentPaths;
    const broken = {
      files: output.files,
      pointers: new Map([[first!, ['skills/power/reference/verifier/ghost.md']]]),
    };
    expect(verifyPointers(broken).join()).toContain('never written');
  });
});

describe('run-wide invariants stay inline', () => {
  // The security-relevant one: untrusted_input is the prompt-injection defence,
  // and every agent reads artifacts written by other agents. If it were a file
  // to fetch on demand, injected content could be in context while the rule
  // about distrusting it was still on disk.
  it.each(
    agentPaths.flatMap((path) => registry.sharedSections.map((s) => [path, s] as const)),
  )('%s inlines <%s>', (path, section) => {
    const body = byPath.get(path)!;
    const usesIt = registry.agents.some(
      (a) => `agents/${a.plugin.name}.md` === path && a.system.includes(`<${section}>`),
    );
    if (!usesIt) return;
    expect(body).toContain(`<${section}>`);
  });

  it('never writes a shared section as a reference file', () => {
    for (const file of output.files) {
      for (const section of registry.sharedSections) {
        expect(file.path).not.toBe(
          `skills/power/reference/${file.path.split('/')[3]}/${section}.md`,
        );
      }
    }
  });
});

describe('role boundaries survive into the plugin tool grants', () => {
  const tools = (name: string): string =>
    frontmatter(`agents/${name}.md`)['tools']!;

  it('the reviewer and verifier cannot edit what they judge', () => {
    for (const name of ['reviewer', 'verifier']) {
      expect(tools(name), name).not.toMatch(/\bEdit\b/);
    }
  });

  it('the reviewer cannot run commands', () => {
    expect(tools('reviewer')).not.toMatch(/\bBash\b/);
  });

  it('gives web access to the researcher alone', () => {
    for (const name of ['orchestrator', 'architect', 'implementer', 'reviewer', 'tester', 'verifier', 'documenter']) {
      expect(tools(name), name).not.toMatch(/\bWebFetch\b/);
    }
    expect(tools('researcher')).toMatch(/\bWebFetch\b/);
  });

  it('gives the coordinator no unrestricted bash — only the gate and state scripts', () => {
    const line = tools('orchestrator');
    expect(line).not.toMatch(/(^|,\s*)Bash(\s*,|$)/);
    expect(line).toContain('scripts/gate.mjs');
    expect(line).toContain('scripts/run-state.mjs');
  });

  it('lets the coordinator dispatch every specialist', () => {
    const line = tools('orchestrator');
    for (const name of ['researcher', 'architect', 'implementer', 'reviewer', 'tester', 'verifier', 'documenter']) {
      expect(line, name).toContain(`power:${name}`);
    }
  });

  it('gives the implementer the full toolset', () => {
    for (const tool of ['Read', 'Write', 'Edit', 'Bash']) {
      expect(tools('implementer')).toMatch(new RegExp(`\\b${tool}\\b`));
    }
  });
});

/**
 * The skill is hand-written and the agents are generated, so they drift in
 * exactly one direction: rename or add an agent in the registry and the skill's
 * `allowed-tools` silently stops covering it. The failure is quiet — the
 * dispatch is simply refused mid-run, long after the build looked fine.
 */
describe('the skill and the generated agents stay in sync', () => {
  const skill = readFileSync(join(PLUGIN_ROOT, 'skills', 'power', 'SKILL.md'), 'utf8');

  it.each(
    registry.agents
      .map((a) => a.plugin!.name)
      // The orchestrator is the standalone driver persona — selected as a
      // session's agent, never dispatched by the front desk.
      .filter((name) => name !== 'orchestrator')
      .map((name) => [name] as const),
  )('SKILL.md grants Agent(power:%s)', (name) => {
    expect(skill).toContain(`power:${name}`);
  });

  it('grants no agent that the build does not produce', () => {
    const built = new Set(registry.agents.map((a) => a.plugin!.name));
    for (const [, name] of skill.matchAll(/power:([a-z][a-z0-9-]*)/g)) {
      expect(built, `SKILL.md grants power:${name}, which no registry entry produces`).toContain(
        name,
      );
    }
  });

  it('references job recipes that exist', () => {
    for (const [, path] of skill.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([^\s)]+)/g)) {
      expect(() =>
        readFileSync(join(PLUGIN_ROOT, 'skills', 'power', path!), 'utf8'),
      ).not.toThrow();
    }
  });
});

describe('build rejects a registry that would lose material', () => {
  it('fails when core_blocks names a block that does not exist', () => {
    const agent = fixture();
    agent.plugin.core_blocks = ['identity', 'nope'];
    expect(() => build([agent], [])).toThrow(BuildError);
    expect(() => build([agent], [])).toThrow(/nope/);
  });

  it('fails when a reference hint names a block that does not exist', () => {
    const agent = fixture();
    agent.plugin.reference_hints = { ghost: 'never' };
    expect(() => build([agent], [])).toThrow(/ghost/);
  });

  it('fails when a hint targets a block that is always inline', () => {
    const agent = fixture();
    agent.plugin.reference_hints = { identity: 'always' };
    expect(() => build([agent], [])).toThrow(/always inline/);
  });

  it('fails when a hint targets a shared section', () => {
    const agent = fixture({
      system: '<identity>\nx\n</identity>\n\n<constitution>\ny\n</constitution>',
    });
    agent.plugin.reference_hints = { constitution: 'sometimes' };
    expect(() => build([agent], ['constitution'])).toThrow(/always inline/);
  });

  it('fails when a prompt has no top-level blocks to split on', () => {
    expect(() => build([fixture({ system: 'just prose' })], [])).toThrow(/no top-level/);
  });
});
