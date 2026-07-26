import { describe, expect, it } from 'vitest';
import { loadRegistry, REGISTRY_ROOT } from '../src/registry.js';

const { agents } = loadRegistry(REGISTRY_ROOT);
const byName = new Map(agents.map((agent) => [agent.name, agent]));

/**
 * These prompts are large, and large files are the ones that get truncated by a
 * bad merge, a partial write, or an editing agent that stops early. Nothing else
 * in the suite would notice — the registry still validates, because a truncated
 * prompt is still a valid prompt.
 */
const MIN_SYSTEM_CHARS = 8_000;

describe('every agent is registered and rendered', () => {
  it('has all eight agents', () => {
    expect([...byName.keys()].sort()).toEqual([
      'power_architect',
      'power_documenter',
      'power_implementer',
      'power_orchestrator',
      'power_researcher',
      'power_reviewer',
      'power_tester',
      'power_verifier',
    ]);
  });

  it.each(agents.map((agent) => [agent.name] as const))(
    '%s renders a substantial prompt',
    (name) => {
      expect(byName.get(name)!.system.length).toBeGreaterThan(MIN_SYSTEM_CHARS);
    },
  );

  it.each(agents.map((agent) => [agent.name] as const))(
    '%s ends with an executive summary of its rules',
    (name) => {
      const system = byName.get(name)!.system;
      expect(system, `${name} has no <critical_rules>`).toContain('<critical_rules>');
      expect(system, `${name} has no <never_do>`).toContain('<never_do>');
      // The doctrine puts the summary last, where adherence is strongest at the
      // start of an agentic run.
      expect(system.trimEnd().endsWith('</critical_rules>')).toBe(true);
    },
  );

  it.each(agents.map((agent) => [agent.name] as const))(
    '%s carries the shared constitution and untrusted-input rules',
    (name) => {
      const system = byName.get(name)!.system;
      expect(system).toContain('<constitution>');
      expect(system).toContain('<untrusted_input>');
    },
  );

  it('leaves no unresolved interpolation in any rendered prompt', () => {
    for (const agent of agents) {
      // Strip code samples, which legitimately contain braces.
      const prose = agent.system.replace(/```[\s\S]*?```|`[^`\n]*`/g, ' ');
      expect(prose.match(/\{\{[^{}]*\}\}/g), `${agent.name} has an unresolved variable`).toBeNull();
    }
  });
});

describe('role boundaries are stated in the prompts that need them', () => {
  it('the coordinator is told it has no capability tools', () => {
    const system = byName.get('power_orchestrator')!.system;
    expect(system).toMatch(/no web search/i);
    expect(system).toMatch(/conduct/i);
  });

  it('the reviewer and verifier are told they cannot edit what they judge', () => {
    for (const name of ['power_reviewer', 'power_verifier']) {
      expect(byName.get(name)!.system, `${name} must state the no-edit rule`).toMatch(
        /never (write or )?edit/i,
      );
    }
  });

  it('the architect is told not to write code', () => {
    expect(byName.get('power_architect')!.system).toMatch(/never write code/i);
  });
});

describe('the toolset enforces what the prompts claim', () => {
  const toolNames = (name: string): string[] => {
    const agent = byName.get(name)!;
    const toolset = agent.tools.find((tool) => tool.type === 'agent_toolset_20260401') as
      | { default_config?: { enabled?: boolean }; configs?: { name: string; enabled: boolean }[] }
      | undefined;
    if (!toolset) return [];
    if (toolset.default_config?.enabled === true) return ['*'];
    return (toolset.configs ?? []).filter((c) => c.enabled).map((c) => c.name);
  };

  // The claim "you conduct, you don't perform" is only true if it is
  // structurally true. Assert the toolset, not the prose.
  it('the coordinator has no bash, no web, and no editor', () => {
    const tools = toolNames('power_orchestrator');
    expect(tools).not.toContain('*');
    for (const forbidden of ['bash', 'web_search', 'web_fetch', 'edit']) {
      expect(tools, `orchestrator must not have ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('the reviewer and verifier cannot run commands or edit source', () => {
    for (const name of ['power_reviewer', 'power_verifier']) {
      const tools = toolNames(name);
      expect(tools).not.toContain('*');
      expect(tools, `${name} must not have bash`).not.toContain('bash');
      expect(tools, `${name} must not have edit`).not.toContain('edit');
    }
  });

  it('the implementer has the full toolset', () => {
    expect(toolNames('power_implementer')).toEqual(['*']);
  });

  // The architect gets search so it can confirm a reference while specifying,
  // but not fetch: broad crawling is the researcher's job and its output is
  // gated on citation discipline the architect is not held to.
  it('limits web search to the researcher and the architect', () => {
    for (const agent of agents) {
      const tools = toolNames(agent.name);
      if (tools.includes('*')) continue;
      const allowed = agent.name === 'power_researcher' || agent.name === 'power_architect';
      expect(tools.includes('web_search'), `${agent.name} web_search`).toBe(allowed);
    }
  });

  it('gives web_fetch to the researcher alone', () => {
    for (const agent of agents) {
      const tools = toolNames(agent.name);
      if (tools.includes('*')) continue;
      expect(tools.includes('web_fetch'), `${agent.name} web_fetch`).toBe(
        agent.name === 'power_researcher',
      );
    }
  });

  it('only the orchestrator, architect, and verifier can call run_gate', () => {
    const withGate = agents
      .filter((agent) => agent.tools.some((tool) => tool['name'] === 'run_gate'))
      .map((agent) => agent.name)
      .sort();
    expect(withGate).toEqual(['power_architect', 'power_orchestrator', 'power_verifier']);
  });
});
