import { describe, it, expect } from 'vitest';
import { compressRequest, parseConfig, resolveTarget, type AnthropicRequest } from '../src/index.js';

const big = 'x'.repeat(20000);

function withToolResult(text: string): AnthropicRequest {
  return {
    model: 'x',
    messages: [
      { role: 'assistant', content: [{ type: 'tool_use', id: 't', name: 'read', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: text }] },
    ],
  };
}

describe('compression (tool output only, safe)', () => {
  it('off is a pure no-op', () => {
    const req = withToolResult(big);
    const { request, saved } = compressRequest(req, 'off');
    expect(saved).toBe(0);
    expect(request).toBe(req);
  });

  it('trims an oversized tool_result and reports the saving', () => {
    const { request, saved } = compressRequest(withToolResult(big), 'safe');
    expect(saved).toBeGreaterThan(10000);
    const block = (request.messages[1]!.content as { content: string }[])[0]!;
    expect(block.content).toContain('trimmed by Relay');
    expect(block.content.length).toBeLessThan(big.length);
  });

  it('max trims more aggressively than safe', () => {
    const safe = compressRequest(withToolResult(big), 'safe').saved;
    const max = compressRequest(withToolResult(big), 'max').saved;
    expect(max).toBeGreaterThan(safe);
  });

  it('leaves a small tool_result untouched', () => {
    const { saved } = compressRequest(withToolResult('short output'), 'safe');
    expect(saved).toBe(0);
  });

  it('never touches user text or the system prompt', () => {
    const req: AnthropicRequest = {
      model: 'x',
      system: big,
      messages: [{ role: 'user', content: big }],
    };
    const { request, saved } = compressRequest(req, 'max');
    expect(saved).toBe(0);
    expect(request.system).toBe(big);
    expect(request.messages[0]!.content).toBe(big);
  });
});

describe('config parse + target resolution', () => {
  it('degrades a broken config to empty/safe defaults', () => {
    expect(parseConfig('not json')).toEqual({ providers: [], compression: 'safe' });
  });

  it('resolves relay/<alias> against the default provider model map', () => {
    const config = parseConfig(
      JSON.stringify({
        defaultProvider: 'groq',
        compression: 'max',
        providers: [
          { id: 'groq', name: 'Groq', kind: 'openai', baseUrl: 'https://api.groq.com/openai/v1', models: { coding: 'llama-3.3-70b', default: 'llama-3.1-8b' } },
        ],
      }),
    );
    expect(resolveTarget(config, 'relay/coding')?.upstreamModel).toBe('llama-3.3-70b');
    expect(resolveTarget(config, 'relay/unknown')?.upstreamModel).toBe('llama-3.1-8b'); // falls to default
    expect(resolveTarget(config, 'relay/coding')?.provider.id).toBe('groq');
  });

  it('returns null when no provider is configured', () => {
    expect(resolveTarget({ providers: [], compression: 'safe' }, 'relay/coding')).toBeNull();
  });
});
