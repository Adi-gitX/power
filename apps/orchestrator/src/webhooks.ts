/**
 * Webhook receiver.
 *
 * Holding an SSE stream open works while something is watching. Continuity —
 * a run that keeps going with the laptop closed — needs the provider to tell us
 * when a session changes state. Webhooks carry only ids; on receipt we fetch the
 * resource and act on its real state.
 *
 * Two properties this file exists to guarantee:
 *
 *   1. **Nothing unverified is acted on.** Signature verification is delegated to
 *      the SDK, which checks the HMAC and rejects a replayed timestamp. Rolling
 *      our own against a single header is the classic way to build a webhook
 *      endpoint that accepts anything.
 *   2. **Redelivery is safe.** The same event can arrive more than once, always
 *      carrying the same id. Every handler runs behind a de-duplication check,
 *      because "retried once" must not mean "run twice".
 */

export interface WebhookEnvelope {
  type: 'event';
  id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    organization_id?: string;
    workspace_id?: string;
  };
}

/**
 * The event types Power reacts to. Anything else is acknowledged and ignored —
 * an endpoint that errors on an unrecognised type breaks the moment the provider
 * adds one.
 */
export const HANDLED_EVENTS = [
  'session.status_idled',
  'session.status_terminated',
  'session.outcome_evaluation_ended',
  'session.thread_terminated',
  'deployment_run.failed',
  'vault_credential.refresh_failed',
] as const;

export type HandledEvent = (typeof HANDLED_EVENTS)[number];

export class WebhookError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

/** Verifies and parses a delivery. Injected so the receiver is testable offline. */
export type Verifier = (body: string, headers: Record<string, string>) => WebhookEnvelope;

/**
 * Build a verifier backed by the SDK. `unwrap` checks the HMAC across the
 * `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers and rejects
 * a delivery older than its freshness window.
 */
export function sdkVerifier(client: unknown): Verifier {
  const webhooks = (client as { beta?: { webhooks?: { unwrap?: unknown } } }).beta?.webhooks;
  if (typeof webhooks?.unwrap !== 'function') {
    throw new WebhookError(
      'This @anthropic-ai/sdk release does not expose beta.webhooks.unwrap. ' +
        'Signature verification must not be hand-rolled — upgrade the SDK instead.',
      500,
    );
  }
  const unwrap = webhooks.unwrap as (body: string, options: unknown) => WebhookEnvelope;
  return (body, headers) => unwrap(body, { headers });
}

export interface SeenStore {
  has(eventId: string): Promise<boolean>;
  add(eventId: string): Promise<void>;
}

/** In-memory de-duplication, bounded so a long-lived process cannot grow forever. */
export class MemorySeenStore implements SeenStore {
  private readonly seen = new Set<string>();

  constructor(private readonly limit = 10_000) {}

  async has(eventId: string): Promise<boolean> {
    return this.seen.has(eventId);
  }

  async add(eventId: string): Promise<void> {
    if (this.seen.size >= this.limit) {
      // Drop the oldest insertion; Set preserves insertion order.
      const oldest = this.seen.values().next();
      if (!oldest.done) this.seen.delete(oldest.value);
    }
    this.seen.add(eventId);
  }
}

export type EventHandler = (event: WebhookEnvelope) => Promise<void>;

export interface ReceiverOptions {
  verify: Verifier;
  seen?: SeenStore;
  handlers: Partial<Record<HandledEvent, EventHandler>>;
  onLog?: (line: string) => void;
}

export interface ReceiptResult {
  status: number;
  /** Why the delivery ended the way it did — surfaced in logs, not to the caller. */
  outcome: 'handled' | 'duplicate' | 'ignored' | 'no_handler' | 'rejected';
}

export class WebhookReceiver {
  private readonly seen: SeenStore;

  constructor(private readonly options: ReceiverOptions) {
    this.seen = options.seen ?? new MemorySeenStore();
  }

  /**
   * Process one delivery. Returns the status to reply with.
   *
   * Anything 2xx acknowledges. We acknowledge duplicates and unrecognised types
   * too: a non-2xx triggers redelivery, and redelivering an event we have
   * deliberately ignored just burns the provider's retry budget until the
   * endpoint is auto-disabled.
   */
  async receive(rawBody: string, headers: Record<string, string>): Promise<ReceiptResult> {
    let event: WebhookEnvelope;
    try {
      event = this.options.verify(rawBody, headers);
    } catch (cause) {
      this.options.onLog?.(`rejected delivery: ${(cause as Error).message}`);
      return { status: 400, outcome: 'rejected' };
    }

    if (await this.seen.has(event.id)) {
      this.options.onLog?.(`duplicate ${event.data.type} (${event.id})`);
      return { status: 204, outcome: 'duplicate' };
    }
    await this.seen.add(event.id);

    if (!(HANDLED_EVENTS as readonly string[]).includes(event.data.type)) {
      return { status: 204, outcome: 'ignored' };
    }

    const handler = this.options.handlers[event.data.type as HandledEvent];
    if (!handler) {
      this.options.onLog?.(`no handler registered for ${event.data.type}`);
      return { status: 204, outcome: 'no_handler' };
    }

    try {
      await handler(event);
      this.options.onLog?.(`handled ${event.data.type} for ${event.data.id}`);
      return { status: 204, outcome: 'handled' };
    } catch (cause) {
      // Fail loudly: a 5xx asks the provider to redeliver, which is the correct
      // response to a transient failure on our side.
      this.options.onLog?.(`handler for ${event.data.type} threw: ${(cause as Error).message}`);
      return { status: 500, outcome: 'rejected' };
    }
  }
}
