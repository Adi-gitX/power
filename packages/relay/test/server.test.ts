import { describe, it, expect, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AddressInfo } from 'node:net';
import { createRelayServer, ConfigStore } from '../src/index.js';

const cleanup: (() => void)[] = [];
afterAll(() => cleanup.forEach((f) => f()));

function port(s: Server): number {
  return (s.address() as AddressInfo).port;
}
function listen(s: Server): Promise<void> {
  return new Promise((r) => s.listen(0, '127.0.0.1', r));
}

/** A canned OpenAI-compatible upstream that streams two content chunks. */
function mockOpenAI(): Server {
  const s = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/chat/completions') {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n');
      res.write('data: {"choices":[{"delta":{"content":" there"},"finish_reason":"stop"}],"usage":{"completion_tokens":2}}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.writeHead(404).end();
    }
  });
  cleanup.push(() => s.close());
  return s;
}

describe('relay end-to-end (mock upstream)', () => {
  it('translates an Anthropic request through an OpenAI provider and streams back', async () => {
    const upstream = mockOpenAI();
    await listen(upstream);

    const dir = mkdtempSync(join(tmpdir(), 'relay-'));
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    const cfg = join(dir, 'relay.config.json');
    writeFileSync(
      cfg,
      JSON.stringify({
        defaultProvider: 'mock',
        compression: 'safe',
        providers: [
          { id: 'mock', name: 'Mock', kind: 'openai', baseUrl: `http://127.0.0.1:${port(upstream)}`, models: { default: 'm' } },
        ],
      }),
    );

    const { server } = createRelayServer(new ConfigStore(cfg));
    cleanup.push(() => server.close());
    await listen(server);
    const base = `http://127.0.0.1:${port(server)}`;

    // health
    const health = await (await fetch(`${base}/health`)).json();
    expect(health).toEqual({ ok: true, providers: 1 });

    // the actual bridge
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'relay/coding', messages: [{ role: 'user', content: 'hi' }], stream: true }),
    });
    expect(res.status).toBe(200);
    const sse = await res.text();
    expect(sse).toContain('event: message_start');
    expect(sse).toContain('"text":"Hi"');
    expect(sse).toContain('"text":" there"');
    expect(sse).toContain('event: message_stop');

    // stats moved
    const stats = await (await fetch(`${base}/stats`)).json();
    expect((stats as { requests: number }).requests).toBeGreaterThanOrEqual(1);
  });

  it('returns 503 when no upstream is configured (so Power falls back to Claude)', async () => {
    const { server } = createRelayServer(new ConfigStore(undefined));
    cleanup.push(() => server.close());
    await listen(server);
    const res = await fetch(`http://127.0.0.1:${port(server)}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'relay/x', messages: [], stream: true }),
    });
    expect(res.status).toBe(503);
  });
});
