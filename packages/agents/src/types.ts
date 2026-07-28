/** Effort levels accepted by the Claude API's `output_config.effort`. */
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * Model IDs this registry is allowed to reference. Deliberately an allowlist:
 * `prompts 2` accepts free-form model strings and consequently ships entries
 * with stray whitespace that nothing catches.
 */
export const ALLOWED_MODELS = [
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-haiku-4-5',
] as const;

export type ModelId = (typeof ALLOWED_MODELS)[number];

export interface ModelConfig {
  id: ModelId;
  effort?: Effort;
}

/** A tool entry, passed through to the Managed Agents `tools` array as-is. */
export interface ToolConfig {
  type: string;
  [key: string]: unknown;
}

/**
 * Build targets. The same registry and the same prompts serve both; only the
 * variable values and the tool vocabulary differ.
 *
 *   cma     — Anthropic Managed Agents: provisioned container, memory store
 *   plugin  — a Claude Code plugin running in the user's own session
 */
export const PROFILES = ['cma', 'plugin'] as const;
export type Profile = (typeof PROFILES)[number];

/** Model aliases Claude Code accepts in subagent frontmatter. */
export const CLAUDE_CODE_MODELS = ['opus', 'sonnet', 'haiku', 'inherit'] as const;
export type ClaudeCodeModel = (typeof CLAUDE_CODE_MODELS)[number];

/**
 * The `plugin` profile's view of an agent. Managed Agents toolsets have no
 * meaning in Claude Code, so each agent states its Claude Code tool line
 * explicitly — that line is where role boundaries are actually enforced.
 */
export interface PluginConfig {
  /** Short name. Addressed as `power:<name>`; the file becomes `agents/<name>.md`. */
  name: string;
  /** Verbatim Claude Code tool grants. */
  tools: string[];
  /** Model alias for the frontmatter. */
  model: ClaudeCodeModel;
  /**
   * Top-level blocks kept inline in the agent body. Every other block in the
   * prompt is emitted as a reference file and linked from a generated pointer
   * table, so material can never go missing silently.
   */
  core_blocks: string[];
  /** Optional `block -> when to read it` hints, merged into the pointer table. */
  reference_hints?: Record<string, string>;
}

/** An agent definition as authored on disk, before `extends` is resolved. */
export interface AgentSource {
  /** Name of another definition to overlay onto. Base definitions are abstract. */
  extends?: string;
  /** Abstract definitions are overlay targets only and are never synced. */
  abstract?: boolean;
  name?: string;
  description?: string;
  model?: ModelConfig;
  /** Path to the prompt template, relative to `prompts/`. */
  template?: string;
  /** Placeholders intentionally left unresolved for per-session substitution. */
  runtime_variables?: string[];
  tools?: ToolConfig[];
  mcp_servers?: { type: string; name: string; url: string }[];
  /** Roster for a coordinator. Presence of this field makes the agent a coordinator. */
  delegates_to?: string[];
  /** Required on every concrete agent; consumed only by the `plugin` profile. */
  plugin?: PluginConfig;
}

/** An agent definition after `extends` resolution, with required fields proven present. */
export interface ResolvedAgent {
  name: string;
  description: string;
  model: ModelConfig;
  template: string;
  runtime_variables: string[];
  tools: ToolConfig[];
  mcp_servers: { type: string; name: string; url: string }[];
  delegates_to: string[];
  /** Present whenever the registry was loaded for the `plugin` profile. */
  plugin: PluginConfig | undefined;
}

/** A fully rendered agent, ready to be synced to the control plane. */
export interface RenderedAgent extends ResolvedAgent {
  /** The rendered system prompt. */
  system: string;
}

export interface SectionSource {
  template: string;
  runtime_variables?: string[];
}

export interface RegistryFile {
  sections?: Record<string, SectionSource>;
}
