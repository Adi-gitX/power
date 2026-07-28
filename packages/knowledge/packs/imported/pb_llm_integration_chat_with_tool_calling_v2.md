LLM_INTEGRATION_CHAT_WITH_TOOL_CALLING_V2

{{universal_key_context}}

<setup>
## Setup

Chat LLM where the model calls custom functions (your backend code) and/or provider-hosted built-in tools (web search, code execution, etc.).

Add to `/app/backend/.env`:
```
PLATFORM_LLM_KEY={platform_llm_key}
```

```python
from dotenv import load_dotenv
load_dotenv()

from platformintegrations.llm.chat import LlmChat, UserMessage

chat = (LlmChat(api_key=PLATFORM_LLM_KEY, session_id="unique-id", system_message="...")
        .with_model("openai", "gpt-5.2"))           # default
#       .with_model("anthropic", "claude-sonnet-4-5-20250929")
#       .with_model("gemini", "gemini-3-flash-preview")
```

## Tool preference

Prefer provider-hosted built-in tools over custom functions when both can fulfil the request — use Anthropic `web_search` rather than SerpAPI, Gemini `codeExecution` rather than a self-hosted sandbox. Honour explicit user requests for a custom or third-party path. Never mix providers (no `googleSearch` on Anthropic, no `bash` on Gemini).

## Streaming with tool calling (use this — mandatory for all user-facing responses)

`stream_message()` is the required pattern. `ToolCallReady` fires after the stream is exhausted — collect results in `pending` and call `add_tool_result` only after the inner loop exits.

```python
import json
from platformintegrations.llm.chat import TextDelta, ToolCallStart, ToolCallReady, StreamDone

user_msg = UserMessage(text="...")
while True:
    pending = []
    async for ev in chat.stream_message(user_msg):
        if isinstance(ev, TextDelta):
            yield ev.content              # stream to UI
        elif isinstance(ev, ToolCallStart):
            pass                          # optional: show "calling {ev.name}..." in UI
        elif isinstance(ev, ToolCallReady):
            pending.append(ev.tool_call)  # collect — do NOT call add_tool_result here
        elif isinstance(ev, StreamDone):
            break
    if not pending:
        break
    for tc in pending:
        chat.add_tool_result(tc.id, json.dumps(dispatch(tc)))
    user_msg = None                       # continuation turn — no new user message
```

- `user_msg = None` on continuation turns; the tool result is already in history
- `StreamDone.content` may be None on a pure tool-call turn
- For server-hosted tools (Gemini `googleSearch`, Anthropic `web_search`) there are no `ToolCallReady` events — tokens stream directly and the loop exits normally

Return the loop above as SSE with proxy buffering disabled, or nginx / Cloudflare buffers the response and tokens arrive in chunks, not word by word:

```python
return StreamingResponse(event_generator(), media_type="text/event-stream",
                         headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
```

## Provider-hosted tools

Two flavours:
- Server tools — provider executes; answer in `response.content`, metadata on `response.raw`. No `add_tool_result()` needed.
- Client tools — model emits a `ToolCall`; you execute and return via `add_tool_result(tc.id, ...)` using the loop above.

Anthropic versions each tool with a date suffix; older versions stay live indefinitely.

### Anthropic — server
- `web_search` — live cited search (time-sensitive queries)
  `.with_tools([{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}])`
- `web_fetch` — fetches and parses a URL body
  `.with_tools([{"type": "web_fetch_20250910", "name": "web_fetch"}])`
- `code_execution` — sandboxed Python (math, data wrangling, charts)
  `.with_tools([{"type": "code_execution_20250825", "name": "code_execution"}])`

### Anthropic — client (you execute)
- `bash` — shell on your backend; sandbox aggressively
  `.with_tools([{"type": "bash_20250124", "name": "bash"}])`
- `text_editor` — view/edit files; commands: `view`, `str_replace`, `create`, `insert`; `name` must be `str_replace_based_edit_tool`
  - Claude 4.x: `.with_tools([{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}])`
  - Claude 3.x: `.with_tools([{"type": "text_editor_20250124", "name": "str_replace_based_edit_tool"}])`

### Gemini — all server
- `googleSearch` — live Google Search grounding
  `.with_tools([{"googleSearch": {}}])`
  Citations: `response.raw.choices[0].message.annotations` (type `url_citation`); queries: `response.raw.choices[0].webSearchQueries`; fallback: `response.raw.choices[0].groundingMetadata.groundingChunks[].web.{uri,title}`
- `codeExecution` — sandboxed Python
  `.with_tools([{"codeExecution": {}}])`
- `urlContext` — fetch/reason over URLs
  `.with_tools([{"urlContext": {}}])`

Gemini server tools require Gemini 2.5+ (Flash or Pro).

### OpenAI — web search

Passed via `with_params()`, NOT `with_tools()`. Requires a search-enabled model.
```python
chat = (chat.with_model("openai", "gpt-4o-search-preview")
            .with_params(web_search_options={
                "search_context_size": "medium",  # "low" | "medium" | "high"
                "user_location": {"type": "approximate", "approximate": {"country": "US"}},
            }))
# Citations: response.raw.choices[0].message annotations.
```

## Model compatibility
- `text_editor`: all Claude 3.x and 4.x — `_20250124` for 3.x, `_20250728` for 4.x
- `web_search` / `web_fetch` / `code_execution` / `bash`: Claude 3.5+, all 4.x
- Gemini server tools: Gemini 2.5+ (Flash and Pro)
- OpenAI `web_search_options`: `gpt-4o-search-preview`, `gpt-4.1`, `gpt-5*` — silently no-ops on others

If a requested tool isn't supported on the chosen model, ask before swapping — never silently switch.

## Non-streaming fallback (only for CLI scripts or explicit user opt-out)

Use `send_message_with_tools()` ONLY when the user has explicitly requested non-streaming behavior.

```python
import json

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    },
}]

chat = chat.with_tools(tools, tool_choice="auto")
response = await chat.send_message_with_tools(UserMessage(text="Weather in NYC?"))

while response.tool_calls:
    for tc in response.tool_calls:
        if tc.name == "get_weather":
            result = my_get_weather(tc.arguments["city"])
            chat.add_tool_result(tc.id, json.dumps(result))
    response = await chat.send_message_with_tools()
```

Rules: never `eval()`/`exec()` model output; loop `while response.tool_calls:` (models chain calls); JSON-encode every result; `tool_choice` = `"auto"` / `"required"` / `"none"`; on parallel calls, one `add_tool_result(tc.id, ...)` per result before the next `send_message_with_tools()`.

## Not supported via universal key

Tell the user; suggest waiting for platform support or bringing their own provider key.
- OpenAI Responses-API tools: `file_search`, `code_interpreter`, `computer_use_preview`, `image_generation`, MCP connectors — unreachable from Chat Completions
- Gemini `fileSearch`, `computerUse` — need a newer LiteLLM
- Anthropic `mcp_toolset`, `tool_search`, `advisor` — beta headers not injected
</setup>

<important_pointers>
Important pointers:
1. Bring your own DB for chat history — `LlmChat` keeps an in-memory thread only.
2. Supports models from OpenAI, Claude (Anthropic), and Gemini. If the user asks for a model you don't recognise, ask them for the provider and model name and try with that.

<available_models>
{{LLM_INTEGRATION_CHAT_PLAYBOOK_V2_models}}
</available_models>
3. Ask the user which model to use; never change models without asking.
4. OpenAI function-calling schema works cross-provider via LiteLLM. Provider-hosted tools do not port across providers.
5. Streaming is mandatory — use `stream_message()` for all user-facing responses. `send_message_with_tools()` is only for explicit non-streaming requests.
6. When serving the stream over HTTP, set `X-Accel-Buffering: no` on the SSE response — without it nginx / Cloudflare buffers tokens into one chunk, not word by word.
</important_pointers>
