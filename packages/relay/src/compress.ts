/**
 * Relay's own token compression — the "fewer tokens per request" feature, built
 * in-house and deliberately conservative.
 *
 * The only thing it touches is `tool_result` content: the machine output a
 * coding agent feeds back (file dumps, command logs, build/test output). That is
 * the noisy bulk of a long run, it is re-derivable, and trimming it never
 * corrupts an instruction the way rewriting a prompt would. Everything else —
 * the user's text, the system prompt, tool definitions, code the model wrote —
 * is passed through untouched. Over a threshold, a tool result is middle-
 * truncated (head + tail kept, a marker in between), preserving the start and
 * end where the signal usually is.
 *
 * This is not RTK/Caveman; it is a small, safe subset we control and can reason
 * about. Off / safe / max only move the threshold.
 */
import type { AnthropicRequest, AnthropicContentBlock } from './types.js';
import type { CompressionMode } from './config.js';

const THRESHOLD: Record<Exclude<CompressionMode, 'off'>, number> = {
  safe: 6000,
  max: 2000,
};

/** Middle-truncate a long string, keeping ~60% head and ~40% tail. */
function squeeze(text: string, max: number): { text: string; saved: number } {
  if (text.length <= max) return { text, saved: 0 };
  const head = Math.floor(max * 0.6);
  const tail = max - head;
  const trimmed = text.length - max;
  const out = `${text.slice(0, head)}\n\n[… ${trimmed} chars trimmed by Relay …]\n\n${text.slice(-tail)}`;
  return { text: out, saved: text.length - out.length };
}

/** Pull the plain text out of a tool_result's `content` (string or blocks). */
function resultText(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts = content
      .filter((b): b is { type: string; text?: string } => !!b && typeof b === 'object')
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string);
    if (parts.length === content.length && parts.length > 0) return parts.join('\n');
  }
  return null; // mixed/non-text content — leave it alone
}

/**
 * Return a compressed copy of the request and the characters saved. Pure — the
 * input is never mutated. `saved` is what `/stats` reports.
 */
export function compressRequest(
  req: AnthropicRequest,
  mode: CompressionMode,
): { request: AnthropicRequest; saved: number } {
  if (mode === 'off') return { request: req, saved: 0 };
  const max = THRESHOLD[mode];
  let saved = 0;

  const messages = req.messages.map((msg) => {
    if (typeof msg.content === 'string') return msg;
    const content: AnthropicContentBlock[] = msg.content.map((block) => {
      if (block.type !== 'tool_result') return block;
      const text = resultText((block as { content?: unknown }).content);
      if (text === null) return block;
      const { text: squeezed, saved: s } = squeeze(text, max);
      if (s === 0) return block;
      saved += s;
      return { ...block, content: squeezed };
    });
    return { ...msg, content };
  });

  return { request: { ...req, messages }, saved };
}
