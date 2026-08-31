import { describe, it, expect } from 'vitest';
import {
  toOpenAIRequest,
  AnthropicStreamEmitter,
  parseSSE,
  type AnthropicRequest,
} from '../src/index.js';

/** Pull the ordered list of `event:` names out of an emitted SSE string. */
function events(sse: string): string[] {
  return sse
    .split('\n')
    .filter((l) => l.startsWith('event: '))
    .map((l) => l.slice('event: '.length));
}
function datas(sse: string): unknown[] {
  return sse
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice('data: '.length)));
}

describe('request translation: Anthropic → OpenAI', () => {
  it('lifts system to a system message and keeps a plain user turn', () => {
    const req: AnthropicRequest = {
      model: 'relay/coding',
      system: 'You are precise.',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    };
    const out = toOpenAIRequest(req, 'llama-3.3-70b');
    expect(out.model).toBe('llama-3.3-70b');
    expect(out.messages[0]).toEqual({ role: 'system', content: 'You are precise.' });
    expect(out.messages[1]).toEqual({ role: 'user', content: 'hello' });
    expect(out.stream_options).toEqual({ include_usage: true });
  });

  it('maps an assistant tool_use to OpenAI tool_calls', () => {
    const req: AnthropicRequest = {
      model: 'x',
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'let me read it' },
            { type: 'tool_use', id: 'tu_1', name: 'read_file', input: { path: '/a' } },
          ],
        },
      ],
    };
    const m = toOpenAIRequest(req, 'x').messages[0]!;
    expect(m.role).toBe('assistant');
    expect(m.content).toBe('let me read it');
    expect(m.tool_calls).toEqual([
      { id: 'tu_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"/a"}' } },
    ]);
  });

  it('splits a user tool_result into an OpenAI tool message', () => {
    const req: AnthropicRequest = {
      model: 'x',
      messages: [
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'file contents' }],
        },
      ],
    };
    const m = toOpenAIRequest(req, 'x').messages[0]!;
    expect(m).toEqual({ role: 'tool', tool_call_id: 'tu_1', content: 'file contents' });
  });

  it('translates tools to OpenAI functions', () => {
    const req: AnthropicRequest = {
      model: 'x',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [{ name: 'grep', description: 'search', input_schema: { type: 'object' } }],
    };
    expect(toOpenAIRequest(req, 'x').tools).toEqual([
      { type: 'function', function: { name: 'grep', description: 'search', parameters: { type: 'object' } } },
    ]);
  });
});

describe('streaming translation: OpenAI deltas → Anthropic SSE', () => {
  it('emits a well-formed text message stream', () => {
    const e = new AnthropicStreamEmitter('relay/coding');
    let out = e.start();
    out += e.push({ choices: [{ delta: { content: 'Hel' } }] });
    out += e.push({ choices: [{ delta: { content: 'lo' } }] });
    out += e.push({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { completion_tokens: 2 } });
    out += e.finish();

    expect(events(out)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ]);
    const md = datas(out).find((d): d is { type: string; delta: { stop_reason: string }; usage: { output_tokens: number } } => (d as { type?: string }).type === 'message_delta')!;
    expect(md.delta.stop_reason).toBe('end_turn');
    expect(md.usage.output_tokens).toBe(2);
  });

  it('emits a tool_use block from streamed tool_call args', () => {
    const e = new AnthropicStreamEmitter('x');
    let out = e.start();
    out += e.push({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'tu_9', function: { name: 'read', arguments: '{"pa' } }] } }] });
    out += e.push({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'th":1}' } }] } }] });
    out += e.push({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] });
    out += e.finish();

    expect(events(out)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ]);
    const start = datas(out).find((d): d is { content_block: { type: string; name: string; id: string } } => (d as { type?: string }).type === 'content_block_start')!;
    expect(start.content_block).toMatchObject({ type: 'tool_use', name: 'read', id: 'tu_9' });
    const delta = datas(out).find((d): d is { delta: { type: string; partial_json: string } } => (d as { type?: string }).type === 'content_block_delta')!;
    expect(delta.delta).toEqual({ type: 'input_json_delta', partial_json: '{"pa' });
    const md = datas(out).find((d): d is { delta: { stop_reason: string } } => (d as { type?: string }).type === 'message_delta')!;
    expect(md.delta.stop_reason).toBe('tool_use');
  });

  it('closes a text block before opening a tool block', () => {
    const e = new AnthropicStreamEmitter('x');
    let out = e.start();
    out += e.push({ choices: [{ delta: { content: 'thinking' } }] });
    out += e.push({ choices: [{ delta: { tool_calls: [{ index: 0, id: 't', function: { name: 'go', arguments: '{}' } }] } }] });
    out += e.finish();
    // text starts+delta, closes, then tool starts+delta, closes.
    expect(events(out)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ]);
  });
});

describe('parseSSE', () => {
  it('parses complete data frames and returns the trailing partial as rest', () => {
    const buf = 'data: {"choices":[{"delta":{"content":"a"}}]}\n\ndata: [DONE]\n\ndata: {"cho';
    const { events: evs, rest } = parseSSE(buf);
    expect(evs).toHaveLength(1);
    expect(rest).toBe('data: {"cho');
  });
});
