/**
 * Relay's HTTP server — an Anthropic-compatible endpoint on loopback that
 * `claude` reaches via ANTHROPIC_BASE_URL. It compresses, routes to the
 * configured upstream, and (for OpenAI-compatible providers) translates the
 * request out and the stream back.
 *
 *   POST /v1/messages   the Anthropic Messages API (streaming + non-streaming)
 *   GET  /health        liveness + provider count
 *   GET  /stats         requests served, characters saved by compression
 *
 * Errors are honest failures: if no upstream is configured or the upstream
 * fails before streaming, Relay returns non-2xx, the `claude` dispatch fails,
 * and Power's never-stops fallback completes the stage on the Claude login.
 */
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import type { AnthropicRequest } from './types.js';
import { ConfigStore, resolveTarget, type RelayProvider } from './config.js';
import { compressRequest } from './compress.js';
import { toOpenAIRequest, AnthropicStreamEmitter, parseSSE } from './translate.js';

interface Stats {
  requests: number;
  savedChars: number;
  upstreamErrors: number;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c: Buffer) => (data += c.toString()));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, code: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(text);
}

function upstreamHeaders(provider: RelayProvider): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (provider.kind === 'passthrough') {
    if (provider.apiKey) h['x-api-key'] = provider.apiKey;
    h['anthropic-version'] = '2023-06-01';
  } else if (provider.apiKey) {
    h['authorization'] = `Bearer ${provider.apiKey}`;
  }
  return h;
}

/** Build the server around a live config store. Exposed for tests. */
export function createRelayServer(store: ConfigStore): { server: Server; stats: Stats } {
  const stats: Stats = { requests: 0, savedChars: 0, upstreamErrors: 0 };

  const server = createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { type: 'error', error: { message: 'relay internal error' } });
      else res.end();
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '';
    if (req.method === 'GET' && (url === '/health' || url === '/api/health/ping')) {
      return json(res, 200, { ok: true, providers: store.current().providers.length });
    }
    if (req.method === 'GET' && url === '/stats') {
      return json(res, 200, stats);
    }
    if (req.method !== 'POST' || !url.startsWith('/v1/messages')) {
      return json(res, 404, { type: 'error', error: { message: 'not found' } });
    }

    stats.requests += 1;
    const anthropicReq = JSON.parse(await readBody(req)) as AnthropicRequest;
    const config = store.current();
    const target = resolveTarget(config, anthropicReq.model);
    if (!target) {
      return json(res, 503, {
        type: 'error',
        error: { message: 'Relay has no upstream provider configured' },
      });
    }

    const { request: compressed, saved } = compressRequest(anthropicReq, config.compression);
    stats.savedChars += saved;

    if (target.provider.kind === 'passthrough') {
      return passthrough(target.provider, compressed, res, stats);
    }
    return openai(target.provider, target.upstreamModel, compressed, res, stats);
  }

  return { server, stats };
}

/** Forward an Anthropic request to an Anthropic-compatible upstream, verbatim. */
async function passthrough(
  provider: RelayProvider,
  request: AnthropicRequest,
  res: ServerResponse,
  stats: Stats,
): Promise<void> {
  const upstream = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: upstreamHeaders(provider),
    body: JSON.stringify(request),
  }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    stats.upstreamErrors += 1;
    return json(res, 502, { type: 'error', error: { message: 'upstream unavailable' } });
  }
  res.writeHead(200, {
    'content-type': upstream.headers.get('content-type') ?? 'text/event-stream',
    'cache-control': 'no-cache',
  });
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

/** Route to an OpenAI-compatible upstream, translating request and stream. */
async function openai(
  provider: RelayProvider,
  model: string,
  request: AnthropicRequest,
  res: ServerResponse,
  stats: Stats,
): Promise<void> {
  const streaming = request.stream === true;
  const body = toOpenAIRequest(request, model);
  const upstream = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: upstreamHeaders(provider),
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    stats.upstreamErrors += 1;
    return json(res, 502, { type: 'error', error: { message: 'upstream unavailable' } });
  }

  const emitter = new AnthropicStreamEmitter(request.model);

  if (!streaming) {
    // Non-streaming: drain, treat the single JSON as one delta, emit once.
    const text = await upstream.text();
    const parsed = JSON.parse(text) as {
      choices?: { message?: { content?: string | null; tool_calls?: unknown[] }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = parsed.choices?.[0];
    res.writeHead(200, { 'content-type': 'application/json' });
    // Reuse the emitter path by faking a chunk, then hand back a message object.
    emitter.push({
      choices: [
        {
          delta: { content: choice?.message?.content ?? '' },
          finish_reason: choice?.finish_reason ?? 'stop',
        },
      ],
      usage: parsed.usage ?? null,
    });
    // For non-streaming we return the classic message object shape.
    res.end(
      JSON.stringify({
        id: `msg_${Date.now().toString(36)}`,
        type: 'message',
        role: 'assistant',
        model: request.model,
        content: choice?.message?.content ? [{ type: 'text', text: choice.message.content }] : [],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: parsed.usage?.prompt_tokens ?? 0,
          output_tokens: parsed.usage?.completion_tokens ?? 0,
        },
      }),
    );
    return;
  }

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
  res.write(emitter.start());
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSSE(buffer);
    buffer = rest;
    for (const ev of events) res.write(emitter.push(ev));
  }
  res.write(emitter.finish());
  res.end();
}

/** Start Relay listening. Returns the server so callers can stop it. */
export function startServer(opts: { port: number; configPath?: string }): Server {
  const store = new ConfigStore(opts.configPath);
  const { server } = createRelayServer(store);
  server.listen(opts.port, '127.0.0.1');
  return server;
}
