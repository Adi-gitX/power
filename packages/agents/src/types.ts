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
