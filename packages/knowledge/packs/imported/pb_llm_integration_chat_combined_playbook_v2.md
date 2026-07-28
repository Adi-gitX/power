LLM_INTEGRATION_CHAT_COMBINED_PLAYBOOK_V2

{{universal_key_context}}

<setup>
## Setup

Use this playbook when the user needs any combination of: tool calling, file attachments, image attachments, or multi-turn conversation history.

Add to `/app/backend/.env`:
```
PLATFORM_LLM_KEY={platform_llm_key}
```

```python
from dotenv import load_dotenv
load_dotenv()
```

STREAMING IS THE DEFAULT: Always use `stream_message()` for all LLM responses. `send_message()` is only for explicit non-streaming requests — not for "quick" or "simple" implementations.

```python
from platformintegrations.llm.chat import LlmChat, UserMessage

chat = (LlmChat(api_key=PLATFORM_LLM_KEY, session_id="unique-session-id", system_message="...")
        .with_model("openai", "gpt-5.2"))           # default
#       .with_model("anthropic", "claude-sonnet-4-5-20250929")
#       .with_model("gemini", "gemini-3-flash-preview")
```

Create a new `LlmChat` instance per session — never reuse across users or threads.

## 1. Multi-turn conversation history

`LlmChat` maintains conversation history in-memory automatically — every `stream_message()` call appends to the thread on `StreamDone`.

```python
from platformintegrations.llm.chat import TextDelta, StreamDone

async for ev in chat.stream_message(UserMessage(text="What's a binary tree?")):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break

async for ev in chat.stream_message(UserMessage(text="Show me one in Python.")):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break

messages = await chat.get_messages()  # ordered list of past turns
```

Persist history to your own DB (Mongo, Postgres, etc.) keyed by `session_id` — the in-memory thread is lost on restart.

Note: the in-memory thread is per-restart only — persist to your DB for cross-session continuity.

## 2. File and image attachments

File attachments use `FileContentWithMimeType` and are Gemini-only — calling `send_message()` with a `FileContentWithMimeType` on OpenAI or Anthropic raises `ChatError`.

Image attachments use `ImageContent` (base64) and work on all three providers (OpenAI, Anthropic, Gemini). File-path images via `FileContentWithMimeType` are Gemini-only.

```python
from platformintegrations.llm.chat import FileContentWithMimeType, ImageContent

# File attachments — Gemini only
pdf  = FileContentWithMimeType(file_path="/path/to/report.pdf", mime_type="application/pdf")
csv_ = FileContentWithMimeType(file_path="/path/to/data.csv",   mime_type="text/csv")
vid  = FileContentWithMimeType(file_path="/path/to/clip.mp4",   mime_type="video/mp4")

# Image — base64, cross-provider (OpenAI, Anthropic, Gemini)
img  = ImageContent(image_base64=encoded_png)  # auto-detects PNG/JPEG/GIF/WEBP from bytes

async for ev in chat.stream_message(UserMessage(
    text="Summarise the report.",
    file_contents=[pdf, csv_, img],
)):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break
```

Image rules (enforce before sending — tests will fail otherwise):
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp` only — transcode SVG/BMP/HEIC first
- For animated images (GIF/APNG/animated WEBP), extract frame 1 only
- Resize before encoding — avoid multi-MB base64 payloads
- Don't send blank or solid-colour images

Save the image rules above to `/app/image_testing.md` before invoking the testing agent for image flows.

## 3. Tool calling

Prefer provider-hosted built-in tools over custom functions when both can fulfil the request. Never mix providers (no `googleMaps` on Anthropic, no `bash` on Gemini).

Once tools are attached, use `stream_message()` for all user-facing responses (Section 5). If using non-streaming, use `send_message_with_tools()` on every call — never mix `send_message()` and `send_message_with_tools()` on the same chat as it drops tool definitions.

### Custom functions
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
            result = my_get_weather(tc.arguments["city"])     # YOUR function
            chat.add_tool_result(tc.id, json.dumps(result))
    response = await chat.send_message_with_tools()           # continuation
```

Rules: never `eval()`/`exec()` model output; loop `while response.tool_calls:` (models chain calls); JSON-encode every result; `tool_choice` = `"auto"` / `"required"` / `"none"`; on parallel calls, one `add_tool_result(tc.id, ...)` per result before the next `send_message_with_tools()`.

### Anthropic — server tools (no `add_tool_result` needed)
- `web_search` — live cited search (time-sensitive queries): `.with_tools([{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}])`
- `web_fetch` — fetches and parses a URL body: `.with_tools([{"type": "web_fetch_20250910", "name": "web_fetch"}])`
- `code_execution` — sandboxed Python (math, data wrangling, charts): `.with_tools([{"type": "code_execution_20250825", "name": "code_execution"}])`

### Anthropic — client tools (you execute via loop)
- `bash` — shell on your backend; sandbox aggressively: `.with_tools([{"type": "bash_20250124", "name": "bash"}])`
- `text_editor` — view/edit files (`view`, `str_replace`, `create`, `insert`); `name` must be `str_replace_based_edit_tool`:
  - Claude 4.x: `.with_tools([{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}])`
  - Claude 3.x: `.with_tools([{"type": "text_editor_20250124", "name": "str_replace_based_edit_tool"}])`

### Gemini — all server tools (no `add_tool_result` needed)
- `googleSearch` — live Google Search grounding; citations on `response.raw.choices[0].message.annotations`: `.with_tools([{"googleSearch": {}}])`
- `codeExecution` — sandboxed Python: `.with_tools([{"codeExecution": {}}])`
- `urlContext` — fetch/reason over URLs: `.with_tools([{"urlContext": {}}])`

Gemini server tools require Gemini 2.5+ (Flash or Pro).

### OpenAI — web search
Passed via `with_params()`, NOT `with_tools()`.
```python
chat = (chat.with_model("openai", "gpt-4o-search-preview")
            .with_params(web_search_options={
                "search_context_size": "medium",  # "low" | "medium" | "high"
                "user_location": {"type": "approximate", "approximate": {"country": "US"}},
            }))
```

### Not supported via universal key
- OpenAI Responses-API tools: `file_search`, `code_interpreter`, `computer_use_preview`, `image_generation`, MCP connectors
- Gemini `fileSearch`, `computerUse`
- Anthropic `mcp_toolset`, `tool_search`, `advisor`

## 4. Combining capabilities

All capabilities use the same `LlmChat` instance — there is no combined mode to switch on.

- Multi-turn history: automatic on every call; reuse the same instance; persist to your DB yourself
- File attachments: pass `file_contents=[FileContentWithMimeType(...)]` on each turn that needs them — not persisted across turns
- Image attachments: pass `file_contents=[ImageContent(...)]` per turn — not persisted across turns
- Provider-hosted tools: `.with_tools([...])` once at setup; applies to all subsequent calls
- Custom function tools: same as above
- OpenAI web search: `.with_params(web_search_options={...})` — NOT `with_tools`

Once tools are attached, use `stream_message()` for all user-facing responses (see Section 5). `send_message_with_tools()` is only for explicit non-streaming requests — never mix the two on the same chat.

To attach multiple tools at once, pass them all in one `with_tools([...])` call:
```python
chat.with_tools([
    {"type": "web_search_20250305", "name": "web_search", "max_uses": 5},
    {"type": "code_execution_20250825", "name": "code_execution"},
    {"type": "function", "function": { ... }},
])
```

Provider compatibility for combinations:
- Any combination with file attachments → Gemini only
- Multi-turn + tool calling → all three providers
- Multi-turn + images → all three providers (base64)
- Tool calling + images → all three providers (base64)
- Files + images, files + tools, all four → Gemini only

Gotchas:
- OpenAI hosted web search is on `with_params(web_search_options=...)`, NOT `with_tools`. Custom functions still use `with_tools`. You can use both on the same OpenAI chat.
- Mix server and client tools freely in one `with_tools([...])` call. In the loop, only call `add_tool_result` for client tools and custom functions — not for server tools.
- Parallel tool calls: the model can return multiple `tool_calls` per response; iterate every `tc` and call `add_tool_result` once each.
- Don't re-attach `with_model()` on an existing chat — it drops conversation context. Build a new `LlmChat` if you need to switch providers.

## 5. Streaming

Use `stream_message()` instead of `send_message()` / `send_message_with_tools()` to deliver tokens to the UI as they arrive.

Plain text (no tools):
```python
from platformintegrations.llm.chat import TextDelta, StreamDone

async for ev in chat.stream_message(UserMessage(text="...")):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break
```

With tool calling — `ToolCallReady` fires after the stream is exhausted, collect results in `pending` and call `add_tool_result` only after the inner loop exits:
```python
from platformintegrations.llm.chat import TextDelta, ToolCallStart, ToolCallReady, StreamDone

user_msg = UserMessage(text="...")
while True:
    pending = []
    async for ev in chat.stream_message(user_msg):
        if isinstance(ev, TextDelta):
            yield ev.content
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
    user_msg = None                       # continuation turn
```

Rules:
- The full call chain must be async
- History is appended on `StreamDone` only — do not break out early
- `user_msg = None` on continuation turns after tool results
- `StreamDone.content` may be None on a pure tool-call turn

Worked example — tools + file + image + multi-turn (Gemini required for files):
```python
from platformintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType, ImageContent
from platformintegrations.llm.chat import TextDelta, ToolCallStart, ToolCallReady, StreamDone

chat = (LlmChat(api_key=PLATFORM_LLM_KEY, session_id=session_id, system_message="You are a research assistant.")
        .with_model("gemini", "gemini-3-flash-preview")
        .with_tools([{"googleSearch": {}}, {"codeExecution": {}}]))

async def run_turn(user_msg):
    while True:
        pending = []
        async for ev in chat.stream_message(user_msg):
            if isinstance(ev, TextDelta):
                yield ev.content
            elif isinstance(ev, ToolCallStart):
                pass  # optional: show "calling {ev.name}..." in UI
            elif isinstance(ev, ToolCallReady):
                pending.append(ev.tool_call)
            elif isinstance(ev, StreamDone):
                break
        if not pending:
            break
        for tc in pending:
            chat.add_tool_result(tc.id, json.dumps(dispatch(tc)))
        user_msg = None

# Turn 1 — PDF + image
async for token in run_turn(UserMessage(
    text="Read this report and describe the chart.",
    file_contents=[
        FileContentWithMimeType(file_path="/uploads/report.pdf", mime_type="application/pdf"),
        ImageContent(image_base64=chart_png_b64),
    ],
)):
    yield token

# Turn 2 — history and tools still active
async for token in run_turn(UserMessage(
    text="Compute the YoY change from table 3 and verify against current news."
)):
    yield token
```

Return the loop above as SSE with proxy buffering disabled, or nginx / Cloudflare buffers the response and tokens arrive in chunks, not word by word:

```python
return StreamingResponse(event_generator(), media_type="text/event-stream",
                         headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
```

</setup>

<important_pointers>
Important pointers:
1. Always make your own database for storing chat history — `LlmChat` keeps an in-memory thread only.
2. Below are supported models. If the user names one not listed, treat as a newer release — confirm with the user and try the provider/model they gave.

<available_models>
{{LLM_INTEGRATION_CHAT_PLAYBOOK_V2_models}}
</available_models>

3. Always ask the user which model to use before implementing; never change the model without asking.
4. File attachments require Gemini. Image attachments (base64) work on all three providers (OpenAI, Anthropic, Gemini); file-path images are Gemini-only.
5. OpenAI function-calling schema works cross-provider via LiteLLM. Provider-hosted tools do not port across providers.
6. If a requested tool isn't supported on the chosen model, ask before swapping — never silently switch.
7. Save the image-testing rules (section 2) to `/app/image_testing.md` before invoking the testing agent for image flows.
8. Streaming is mandatory — use `stream_message()` for all user-facing responses. `send_message()` / `send_message_with_tools()` are only for explicit non-streaming requests.
9. When serving the stream over HTTP, set `X-Accel-Buffering: no` on the SSE response — without it nginx / Cloudflare buffers tokens into one chunk, not word by word.
</important_pointers>
