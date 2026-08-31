/**
 * The two wire formats Relay bridges, typed to exactly what it touches — no
 * SDK dependency, so the bundle stays tiny and self-contained.
 *
 * `claude` (Power's dispatch) speaks the Anthropic Messages API in. Relay
 * translates that to the OpenAI Chat Completions API for any OpenAI-compatible
 * upstream (Groq, OpenRouter, DeepSeek, Together, Gemini, Ollama, …), then
 * translates the stream back. Only the fields Relay reads or emits are modelled;
 * everything else is passed through or ignored.
 */

// ---- Anthropic Messages API (the side `claude` talks to) ----

export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean }
  | { type: string; [k: string]: unknown };

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | AnthropicContentBlock[];
  tools?: AnthropicTool[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  [k: string]: unknown;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

// ---- OpenAI Chat Completions API (the side upstreams talk) ----

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: { type: 'function'; function: { name: string; description?: string; parameters: Record<string, unknown> } }[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  stream_options?: { include_usage: boolean };
}

/** One parsed OpenAI streaming chunk (only the fields Relay reads). */
export interface OpenAIStreamChunk {
  choices?: {
    delta?: {
      content?: string | null;
      tool_calls?: {
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
    finish_reason?: string | null;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
}
