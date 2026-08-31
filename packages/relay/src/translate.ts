/**
 * The bridge: Anthropic Messages ⇄ OpenAI Chat Completions.
 *
 * `claude` sends the Anthropic Messages API; OpenAI-compatible upstreams speak
 * Chat Completions. The request mapping is a pure function; the streaming
 * response is a small state machine that turns OpenAI deltas back into the
 * Anthropic SSE event sequence `claude` expects (message_start →
 * content_block_start/delta/stop per block → message_delta → message_stop).
 *
 * Everything here is pure and deterministic so it can be fixture-tested without
 * a network — which is how a translator this fiddly earns trust.
 */
import type {
  AnthropicRequest,
  AnthropicContentBlock,
  OpenAIRequest,
  OpenAIMessage,
  OpenAIStreamChunk,
} from './types.js';

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

function systemText(system: AnthropicRequest['system']): string {
  if (!system) return '';
  if (typeof system === 'string') return system;
  return system
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && typeof (b as { text?: unknown }).text === 'string')
    .map((b) => b.text)
    .join('\n');
}

function resultToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) =>
        b && typeof b === 'object' && (b as { type?: string }).type === 'text'
          ? String((b as { text?: unknown }).text ?? '')
          : typeof b === 'string'
            ? b
            : JSON.stringify(b),
      )
      .join('\n');
  }
  return content == null ? '' : JSON.stringify(content);
}

/** Anthropic Messages request → OpenAI Chat Completions request. */
export function toOpenAIRequest(req: AnthropicRequest, upstreamModel: string): OpenAIRequest {
  const messages: OpenAIMessage[] = [];

  const sys = systemText(req.system);
  if (sys) messages.push({ role: 'system', content: sys });

  for (const msg of req.messages) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
      continue;
    }
    const texts: string[] = [];
    const toolCalls: NonNullable<OpenAIMessage['tool_calls']> = [];
    const toolResults: OpenAIMessage[] = [];

    for (const block of msg.content) {
      if (block.type === 'text') {
        texts.push(String((block as { text?: unknown }).text ?? ''));
      } else if (block.type === 'tool_use') {
        const b = block as { id: string; name: string; input: unknown };
        toolCalls.push({
          id: b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
        });
      } else if (block.type === 'tool_result') {
        const b = block as { tool_use_id: string; content: unknown };
        toolResults.push({ role: 'tool', tool_call_id: b.tool_use_id, content: resultToText(b.content) });
      }
    }

    // OpenAI wants tool results as their own messages (after the assistant turn
    // that called them); Anthropic nests them in a user turn. Split accordingly.
    for (const tr of toolResults) messages.push(tr);

    if (msg.role === 'assistant') {
      const m: OpenAIMessage = { role: 'assistant', content: texts.join('\n') || null };
      if (toolCalls.length > 0) m.tool_calls = toolCalls;
      if (m.content !== null || m.tool_calls) messages.push(m);
    } else if (texts.length > 0) {
      messages.push({ role: 'user', content: texts.join('\n') });
    }
  }

  const out: OpenAIRequest = {
    model: upstreamModel,
    messages,
    stream: req.stream ?? false,
  };
  if (req.stream) out.stream_options = { include_usage: true };
  if (typeof req.max_tokens === 'number') out.max_tokens = req.max_tokens;
  if (typeof req.temperature === 'number') out.temperature = req.temperature;
  if (req.tools && req.tools.length > 0) {
    out.tools = req.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description ?? '', parameters: t.input_schema },
    }));
  }
  return out;
}

function mapStopReason(finish: string | null | undefined): string {
  switch (finish) {
    case 'length':
      return 'max_tokens';
    case 'tool_calls':
    case 'function_call':
      return 'tool_use';
    default:
      return 'end_turn';
  }
}

/** One Anthropic SSE frame. */
export function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Turns a sequence of OpenAI stream chunks into the Anthropic SSE event stream.
 * Stateful across a single response: it opens/closes exactly one content block
 * at a time and maps OpenAI tool-call indices to Anthropic block indices.
 */
export class AnthropicStreamEmitter {
  private index = -1;
  private open: 'text' | 'tool' | null = null;
  private readonly toolBlock = new Map<number, number>();
  private outTokens = 0;
  private stop = 'end_turn';
  private readonly messageId = id('msg');

  constructor(
    private readonly model: string,
    private readonly inputTokens = 0,
  ) {}

  start(): string {
    return sse('message_start', {
      type: 'message_start',
      message: {
        id: this.messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: this.model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: this.inputTokens, output_tokens: 0 },
      },
    });
  }

  private closeOpen(): string {
    if (this.open === null) return '';
    this.open = null;
    return sse('content_block_stop', { type: 'content_block_stop', index: this.index });
  }

  /** Feed one parsed OpenAI chunk; returns the Anthropic events it produces. */
  push(chunk: OpenAIStreamChunk): string {
    let out = '';
    const choice = chunk.choices?.[0];
    if (chunk.usage?.completion_tokens != null) this.outTokens = chunk.usage.completion_tokens;
    if (!choice) return out;

    const delta = choice.delta;
    if (delta?.content) {
      if (this.open !== 'text') {
        out += this.closeOpen();
        this.index += 1;
        this.open = 'text';
        out += sse('content_block_start', {
          type: 'content_block_start',
          index: this.index,
          content_block: { type: 'text', text: '' },
        });
      }
      out += sse('content_block_delta', {
        type: 'content_block_delta',
        index: this.index,
        delta: { type: 'text_delta', text: delta.content },
      });
    }

    for (const tc of delta?.tool_calls ?? []) {
      let block = this.toolBlock.get(tc.index);
      if (block === undefined) {
        out += this.closeOpen();
        this.index += 1;
        block = this.index;
        this.toolBlock.set(tc.index, block);
        this.open = 'tool';
        out += sse('content_block_start', {
          type: 'content_block_start',
          index: block,
          content_block: { type: 'tool_use', id: tc.id ?? id('toolu'), name: tc.function?.name ?? '', input: {} },
        });
      }
      if (tc.function?.arguments) {
        out += sse('content_block_delta', {
          type: 'content_block_delta',
          index: block,
          delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
        });
      }
    }

    if (choice.finish_reason) this.stop = mapStopReason(choice.finish_reason);
    return out;
  }

  finish(): string {
    let out = this.closeOpen();
    out += sse('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: this.stop, stop_sequence: null },
      usage: { output_tokens: this.outTokens },
    });
    out += sse('message_stop', { type: 'message_stop' });
    return out;
  }
}

/** Split a growing SSE buffer into complete `data:` payloads (minus `[DONE]`). */
export function parseSSE(buffer: string): { events: OpenAIStreamChunk[]; rest: string } {
  const events: OpenAIStreamChunk[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    for (const line of part.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice('data:'.length).trim();
      if (payload === '' || payload === '[DONE]') continue;
      try {
        events.push(JSON.parse(payload) as OpenAIStreamChunk);
      } catch {
        // Ignore a partial/garbage frame; the next flush will carry the rest.
      }
    }
  }
  return { events, rest };
}
