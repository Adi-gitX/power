/**
 * Relay's configuration — the providers it can route to, and how. Power owns
 * this: it writes `relay.config.json` (app-private, keys never in git) and Relay
 * reads it, hot-reloading when the file changes. A missing/broken file yields an
 * empty, safe config rather than a crash.
 */
import { readFileSync, watch } from 'node:fs';

export type CompressionMode = 'off' | 'safe' | 'max';

export interface RelayProvider {
  /** Stable id, referenced by `defaultProvider`. */
  id: string;
  /** Human label for the UI and logs. */
  name: string;
  /** Wire shape: an OpenAI-compatible upstream, or an Anthropic passthrough. */
  kind: 'openai' | 'passthrough';
  /** Upstream base URL. OpenAI-compatible endpoints usually end in `/v1`. */
  baseUrl: string;
  /** Upstream API key. Empty for keyless local servers (Ollama, LM Studio). */
  apiKey?: string;
  /** alias → upstream model id, e.g. { coding: "llama-3.3-70b", cheap: "…" }. */
  models: Record<string, string>;
}

export interface RelayConfig {
  providers: RelayProvider[];
  compression: CompressionMode;
  /** Which provider serves a request when none is named. */
  defaultProvider?: string;
}

export const EMPTY_CONFIG: RelayConfig = { providers: [], compression: 'safe' };

/** Parse config JSON defensively — unknown/partial shapes degrade to defaults. */
export function parseConfig(raw: string): RelayConfig {
  try {
    const obj = JSON.parse(raw) as Partial<RelayConfig>;
    const providers = Array.isArray(obj.providers)
      ? obj.providers.filter((p): p is RelayProvider => !!p && typeof p.baseUrl === 'string')
      : [];
    const compression: CompressionMode =
      obj.compression === 'off' || obj.compression === 'max' ? obj.compression : 'safe';
    const config: RelayConfig = { providers, compression };
    if (typeof obj.defaultProvider === 'string') config.defaultProvider = obj.defaultProvider;
    return config;
  } catch {
    return EMPTY_CONFIG;
  }
}

/**
 * Resolve an incoming model name to a concrete upstream. Power sends aliases
 * like `relay/coding`; the `relay/` prefix is stripped and the alias looked up
 * in the chosen provider's model map, falling back to its `default`, then the
 * alias verbatim (so a real upstream id passes straight through).
 */
export function resolveTarget(
  config: RelayConfig,
  model: string,
): { provider: RelayProvider; upstreamModel: string } | null {
  const provider =
    config.providers.find((p) => p.id === config.defaultProvider) ?? config.providers[0];
  if (!provider) return null;
  const alias = model.startsWith('relay/') ? model.slice('relay/'.length) : model;
  const upstreamModel = provider.models[alias] ?? provider.models['default'] ?? alias;
  return { provider, upstreamModel };
}

/** A live view of the config file that reloads on change. */
export class ConfigStore {
  private config: RelayConfig = EMPTY_CONFIG;

  constructor(private readonly path: string | undefined) {
    this.reload();
    if (path) {
      try {
        watch(path, { persistent: false }, () => this.reload());
      } catch {
        // No file to watch yet — reload() already left us on defaults.
      }
    }
  }

  current(): RelayConfig {
    return this.config;
  }

  reload(): void {
    if (!this.path) {
      this.config = EMPTY_CONFIG;
      return;
    }
    try {
      this.config = parseConfig(readFileSync(this.path, 'utf8'));
    } catch {
      this.config = EMPTY_CONFIG;
    }
  }
}
