import { describe, expect, it, vi } from 'vitest';
import {
  MemorySeenStore,
  WebhookReceiver,
  sdkVerifier,
  WebhookError,
  type Verifier,
  type WebhookEnvelope,
} from '../src/webhooks.js';

const envelope = (type: string, id = 'whe_1'): WebhookEnvelope => ({
  type: 'event',
  id,
  created_at: '2026-07-27T00:00:00Z',
  data: { type, id: 'sesn_1' },
});

const accepting = (event: WebhookEnvelope): Verifier => () => event;
const rejecting: Verifier = () => {
  throw new Error('signature mismatch');
};

describe('verification', () => {
  it('rejects an unverified delivery with a 400 and never dispatches', async () => {
    const handler = vi.fn();
    const receiver = new WebhookReceiver({
      verify: rejecting,
      handlers: { 'session.status_idled': handler },
    });

    expect(await receiver.receive('{}', {})).toEqual({ status: 400, outcome: 'rejected' });
    expect(handler).not.toHaveBeenCalled();
  });

  // Hand-rolling HMAC verification against a single header is the classic way to
  // build an endpoint that accepts anything, so refuse rather than improvise.
  it('refuses to build a verifier when the SDK cannot provide one', () => {
    expect(() => sdkVerifier({})).toThrow(WebhookError);
    expect(() => sdkVerifier({})).toThrow(/must not be hand-rolled/);
  });

  it('builds a verifier when the SDK exposes unwrap', () => {
    const unwrap = vi.fn().mockReturnValue(envelope('session.status_idled'));
    const verify = sdkVerifier({ beta: { webhooks: { unwrap } } });

    expect(verify('{"a":1}', { 'webhook-id': 'x' })).toEqual(envelope('session.status_idled'));
    expect(unwrap).toHaveBeenCalledWith('{"a":1}', { headers: { 'webhook-id': 'x' } });
  });
});

describe('delivery handling', () => {
  it('dispatches a handled event', async () => {
    const handler = vi.fn();
    const receiver = new WebhookReceiver({
      verify: accepting(envelope('session.status_idled')),
      handlers: { 'session.status_idled': handler },
    });

    expect(await receiver.receive('{}', {})).toEqual({ status: 204, outcome: 'handled' });
    expect(handler).toHaveBeenCalledOnce();
  });

  // Redelivery carries the same event id. Acting twice on "the run finished" is
  // how a single completion becomes two follow-up tasks.
  it('runs a handler once even when the event is redelivered', async () => {
    const handler = vi.fn();
    const receiver = new WebhookReceiver({
      verify: accepting(envelope('session.status_terminated')),
      handlers: { 'session.status_terminated': handler },
    });

    expect((await receiver.receive('{}', {})).outcome).toBe('handled');
    expect((await receiver.receive('{}', {})).outcome).toBe('duplicate');
    expect((await receiver.receive('{}', {})).outcome).toBe('duplicate');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('acknowledges an unrecognised type instead of forcing a retry loop', async () => {
    const receiver = new WebhookReceiver({
      verify: accepting(envelope('some.future.event')),
      handlers: {},
    });
    expect(await receiver.receive('{}', {})).toEqual({ status: 204, outcome: 'ignored' });
  });

  it('acknowledges a handled type with no handler registered', async () => {
    const receiver = new WebhookReceiver({
      verify: accepting(envelope('deployment_run.failed')),
      handlers: {},
    });
    expect(await receiver.receive('{}', {})).toEqual({ status: 204, outcome: 'no_handler' });
  });

  // A 5xx asks for redelivery, which is the right answer to a transient failure
  // on our side — unlike a 4xx, which would silently drop the event.
  it('returns 500 when a handler throws, so the delivery is retried', async () => {
    const receiver = new WebhookReceiver({
      verify: accepting(envelope('session.status_idled')),
      handlers: {
        'session.status_idled': async () => {
          throw new Error('database unavailable');
        },
      },
    });
    expect(await receiver.receive('{}', {})).toEqual({ status: 500, outcome: 'rejected' });
  });

  it('treats distinct event ids as distinct deliveries', async () => {
    const handler = vi.fn();
    let current = envelope('session.status_idled', 'whe_1');
    const receiver = new WebhookReceiver({
      verify: () => current,
      handlers: { 'session.status_idled': handler },
    });

    await receiver.receive('{}', {});
    current = envelope('session.status_idled', 'whe_2');
    await receiver.receive('{}', {});

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('the de-duplication store', () => {
  it('remembers what it has seen', async () => {
    const store = new MemorySeenStore();
    expect(await store.has('a')).toBe(false);
    await store.add('a');
    expect(await store.has('a')).toBe(true);
  });

  it('evicts the oldest entry rather than growing without bound', async () => {
    const store = new MemorySeenStore(2);
    await store.add('a');
    await store.add('b');
    await store.add('c');

    expect(await store.has('a')).toBe(false);
    expect(await store.has('b')).toBe(true);
    expect(await store.has('c')).toBe(true);
  });
});
