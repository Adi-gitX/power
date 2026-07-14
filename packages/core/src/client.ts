/**
 * The Managed Agents boundary.
 *
 * Every call into the beta control plane goes through this file. CMA is a beta
 * surface whose shapes can move, and the plan's mitigation is that a breaking
 * change should be one file to fix, not a search across the codebase.
 *
 * Auth is BYOK: the client is constructed with the customer's own key, so
 * sessions run in their workspace, on their rate limits, at their cost. We never
 * hold inference budget on their behalf.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { RenderedAgent } from '@power/agents';

/** Beta header for the Managed Agents surface. */
export const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01';

export interface PowerClientOptions {
  /** The customer's Anthropic API key. */
  apiKey: string;
  /** Override for testing against a recording proxy. */
  baseURL?: string;
  maxRetries?: number;
}

export interface SyncedAgent {
  name: string;
  id: string;
  version: number;
}

export interface EnvironmentSpec {
  name: string;
  /** `unrestricted` egress, or an allowlist. */
  networking?:
    | { type: 'unrestricted' }
    | {
        type: 'limited';
        allowed_hosts?: string[];
        allow_package_managers?: boolean;
        allow_mcp_servers?: boolean;
      };
}

export interface StartRunOptions {
  coordinatorId: string;
  coordinatorVersion?: number;
  environmentId: string;
  title: string;
  memoryStoreId?: string;
  vaultIds?: string[];
  repository?: {
    url: string;
    authorizationToken: string;
    mountPath?: string;
    branch?: string;
  };
  /** The goal, compiled into a rubric-graded outcome. */
  outcome?: { description: string; rubric: string; maxIterations?: number };
  /** Plain kickoff message, when the goal is not outcome-shaped. */
  message?: string;
}

/**
 * The subset of a session event this platform reacts to. The beta stream carries
 * more; we narrow deliberately so an added event type cannot silently change
 * behaviour.
 */
export interface SessionEvent {
  type: string;
  id?: string;
  processed_at?: string | null;
  [key: string]: unknown;
}

export class PowerClientError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PowerClientError';
  }
}

export interface MemoryEntry {
  type: 'memory' | 'memory_prefix';
  id: string;
  path: string;
  content?: string;
  content_sha256?: string;
}

/* The beta namespace is not fully typed in every SDK release; this is the
 * narrow shape we depend on, asserted once here rather than at each call site. */
interface BetaSurface {
  agents: {
    create(body: unknown): Promise<{ id: string; version: number }>;
    update(id: string, body: unknown): Promise<{ id: string; version: number }>;
    list(query?: unknown): AsyncIterable<{ id: string; name: string; version: number }>;
  };
  environments: {
    create(body: unknown): Promise<{ id: string }>;
    list(query?: unknown): AsyncIterable<{ id: string; name: string }>;
  };
  memoryStores: {
    create(body: unknown): Promise<{ id: string }>;
    memories: {
      create(storeId: string, body: unknown): Promise<{ id: string; path: string }>;
      update(memoryId: string, body: unknown): Promise<{ id: string }>;
      list(storeId: string, query?: unknown): AsyncIterable<MemoryEntry>;
    };
  };
  sessions: {
    create(body: unknown): Promise<{ id: string; status: string }>;
    retrieve(id: string): Promise<{ id: string; status: string }>;
    archive(id: string): Promise<unknown>;
    events: {
      send(sessionId: string, body: unknown): Promise<unknown>;
      stream(sessionId: string, query?: unknown): Promise<AsyncIterable<SessionEvent>>;
      list(sessionId: string, query?: unknown): AsyncIterable<SessionEvent>;
    };
  };
}

export class PowerClient {
  private readonly sdk: Anthropic;

  constructor(options: PowerClientOptions) {
    this.sdk = new Anthropic({
      apiKey: options.apiKey,
      ...(options.baseURL !== undefined ? { baseURL: options.baseURL } : {}),
      maxRetries: options.maxRetries ?? 3,
    });
  }

  private get beta(): BetaSurface {
    const beta = (this.sdk as unknown as { beta?: unknown }).beta;
    if (!beta) {
      throw new PowerClientError(
        'This @anthropic-ai/sdk release does not expose the beta namespace. ' +
          'Managed Agents requires a version with `client.beta.agents` and `client.beta.sessions`.',
      );
    }
    return beta as BetaSurface;
  }

  /**
   * Push the local agent registry into the customer's workspace.
   *
   * Agents are persistent, versioned objects: created once and referenced by id
   * forever after. Calling create on every run would accumulate orphaned agents
   * and defeat the versioning that lets a bad prompt be rolled back without
   * disturbing in-flight sessions — so this is an upsert keyed on name.
   */
  async syncAgents(agents: readonly RenderedAgent[]): Promise<SyncedAgent[]> {
    const existing = new Map<string, { id: string; version: number }>();
    try {
      for await (const agent of this.beta.agents.list({ limit: 100 })) {
        existing.set(agent.name, { id: agent.id, version: agent.version });
      }
    } catch (cause) {
      throw new PowerClientError('failed to list existing agents', cause);
    }

    // Roster entries reference agents by id, so every specialist must exist
    // before the coordinator that delegates to it.
    const ordered = [...agents].sort(
      (a, b) => a.delegates_to.length - b.delegates_to.length,
    );

    const synced = new Map<string, SyncedAgent>();
    for (const agent of ordered) {
      const body = this.toAgentBody(agent, synced);
      const prior = existing.get(agent.name);
      try {
        const result = prior
          ? await this.beta.agents.update(prior.id, { ...body, version: prior.version })
          : await this.beta.agents.create(body);
        synced.set(agent.name, { name: agent.name, id: result.id, version: result.version });
      } catch (cause) {
        throw new PowerClientError(`failed to sync agent ${agent.name}`, cause);
      }
    }

    return [...synced.values()];
  }

  private toAgentBody(
    agent: RenderedAgent,
    synced: Map<string, SyncedAgent>,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      name: agent.name,
      description: agent.description,
      model: agent.model.effort
        ? { id: agent.model.id, effort: agent.model.effort }
        : agent.model.id,
      system: agent.system,
      tools: agent.tools,
    };

    if (agent.mcp_servers.length > 0) body['mcp_servers'] = agent.mcp_servers;

    if (agent.delegates_to.length > 0) {
      body['multiagent'] = {
        type: 'coordinator',
        agents: agent.delegates_to.map((name) => {
          const target = synced.get(name);
          if (!target) {
            throw new PowerClientError(
              `cannot build roster for ${agent.name}: ${name} was not synced first`,
            );
          }
          return { type: 'agent', id: target.id, version: target.version };
        }),
      };
    }

    return body;
  }

  /** Find an environment by name, or create it. Names are unique per workspace. */
  async ensureEnvironment(spec: EnvironmentSpec): Promise<string> {
    try {
      for await (const environment of this.beta.environments.list({ limit: 100 })) {
        if (environment.name === spec.name) return environment.id;
      }
      const created = await this.beta.environments.create({
        name: spec.name,
        config: {
          type: 'cloud',
          networking: spec.networking ?? { type: 'unrestricted' },
        },
      });
      return created.id;
    } catch (cause) {
      throw new PowerClientError(`failed to ensure environment ${spec.name}`, cause);
    }
  }

  /** Create the per-project memory store that backs the artifact bus. */
  async createMemoryStore(name: string, description: string): Promise<string> {
    try {
      const store = await this.beta.memoryStores.create({ name, description });
      return store.id;
    } catch (cause) {
      throw new PowerClientError(`failed to create memory store ${name}`, cause);
    }
  }

  /**
   * Start a run.
   *
   * Passing the kickoff in `initial_events` collapses create-then-send into one
   * call, and the session comes back already `running` rather than passing
   * through `idle` — a client that waits for an idle→running edge to know work
   * began will wait forever.
   */
  async startRun(options: StartRunOptions): Promise<{ id: string; status: string }> {
    const initialEvents: unknown[] = [];

    if (options.outcome) {
      initialEvents.push({
        type: 'user.define_outcome',
        description: options.outcome.description,
        rubric: { type: 'text', content: options.outcome.rubric },
        max_iterations: options.outcome.maxIterations ?? 5,
      });
    } else if (options.message) {
      initialEvents.push({
        type: 'user.message',
        content: [{ type: 'text', text: options.message }],
      });
    }

    const resources: unknown[] = [];
    if (options.memoryStoreId) {
      resources.push({
        type: 'memory_store',
        memory_store_id: options.memoryStoreId,
        access: 'read_write',
        instructions:
          'The artifact bus for this run. Read the artifacts named in your brief; ' +
          'write only the artifacts you own.',
      });
    }
    if (options.repository) {
      resources.push({
        type: 'github_repository',
        url: options.repository.url,
        authorization_token: options.repository.authorizationToken,
        ...(options.repository.mountPath ? { mount_path: options.repository.mountPath } : {}),
        ...(options.repository.branch
          ? { checkout: { type: 'branch', name: options.repository.branch } }
          : {}),
      });
    }

    try {
      return await this.beta.sessions.create({
        agent: options.coordinatorVersion
          ? { type: 'agent', id: options.coordinatorId, version: options.coordinatorVersion }
          : options.coordinatorId,
        environment_id: options.environmentId,
        title: options.title,
        ...(resources.length > 0 ? { resources } : {}),
        ...(options.vaultIds?.length ? { vault_ids: options.vaultIds } : {}),
        ...(initialEvents.length > 0 ? { initial_events: initialEvents } : {}),
      });
    } catch (cause) {
      throw new PowerClientError('failed to start run', cause);
    }
  }

  async sendEvents(sessionId: string, events: unknown[]): Promise<void> {
    try {
      await this.beta.sessions.events.send(sessionId, { events });
    } catch (cause) {
      throw new PowerClientError(`failed to send events to ${sessionId}`, cause);
    }
  }

  /**
   * Stream a session's events with gap-free reconnect semantics.
   *
   * SSE has no replay, so a dropped connection silently loses everything emitted
   * during the gap. The fix is to open the stream first (it buffers from that
   * moment), then read history, then tail live while de-duplicating on event id.
   */
  async *streamEvents(sessionId: string, seen = new Set<string>()): AsyncGenerator<SessionEvent> {
    const stream = await this.beta.sessions.events.stream(sessionId);

    for await (const event of this.beta.sessions.events.list(sessionId)) {
      if (event.id) seen.add(event.id);
      yield event;
    }

    for await (const event of stream) {
      if (event.id && seen.has(event.id)) continue;
      if (event.id) seen.add(event.id);
      yield event;
    }
  }

  /** List the memories in a store, keyed by path, for host-side gate evaluation. */
  async readMemoryStore(storeId: string): Promise<Map<string, string>> {
    const contents = new Map<string, string>();
    try {
      for await (const entry of this.beta.memoryStores.memories.list(storeId, {
        view: 'full',
        path_prefix: '/',
      })) {
        if (entry.type === 'memory' && entry.content !== undefined) {
          contents.set(entry.path.replace(/^\//, ''), entry.content);
        }
      }
    } catch (cause) {
      throw new PowerClientError(`failed to read memory store ${storeId}`, cause);
    }
    return contents;
  }

  async getSession(sessionId: string): Promise<{ id: string; status: string }> {
    return this.beta.sessions.retrieve(sessionId);
  }

  /**
   * Archive once the session has actually settled. The stream reports idle
   * slightly before the queryable status catches up, so archiving immediately
   * after the idle event intermittently 400s.
   */
  async archiveWhenSettled(sessionId: string, attempts = 10): Promise<boolean> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const session = await this.getSession(sessionId);
      if (session.status !== 'running') {
        await this.beta.sessions.archive(sessionId);
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  }
}
