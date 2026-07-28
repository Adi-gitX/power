LLM_INTEGRATION_CHAT_WITH_FILES_ATTACHMENTS_PLAYBOOK** 

{{universal_key_context}}

<setup> 
## Setup Integrating various LLM apis like openai, anthropic and gemeni 
Add this line to /app/backend/.env file in a new line in case user wants universal key 
```
PLATFORM_LLM_KEY={platform_llm_key}
```

*** IMPORTANT NOTE *** 
Always make sure to import load_dotenv before using any environment variables. 
```python
from dotenv import load_dotenv
load_dotenv()
```
Also, have fallback for environment variables in case they are not set. 

STREAMING IS THE DEFAULT: Always use `stream_message()` for all LLM responses. `send_message()` is only for explicit non-streaming requests — not for "quick" or "simple" implementations.

## Basic Usage 
```python
from platformintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

# Initialize the chat with your API key, session ID, and system message
chat = LlmChat(
    api_key="your-api-key",
    session_id="unique-session-id",
    system_message="You are a helpful assistant."
)

# Stream the response (default — always use this)
async for event in chat.stream_message(UserMessage(text="Say 'Hello, integration test!' and nothing else.")):
    if isinstance(event, TextDelta):
        yield event.content   # stream tokens to SSE / WebSocket
    elif isinstance(event, StreamDone):
        break
```

## Configuration Options
The `LlmChat` class provides several configuration methods:

```python
# Change the model and provider (default is "gpt-5.4" with "openai")
chat.with_model("openai", "gpt-5.4")

# Use Anthropic's Claude
chat.with_model("anthropic", "claude-sonnet-4-20250514")

# Use Gemini
chat.with_model("gemini", "gemini-2.5-flash")
```

## Message Types
### Text Messages
```python
user_message = UserMessage(
    text="Your message here"
)
```

Example:
### Basic Chat with Different Providers
```python
# Using OpenAI
openai_chat = LlmChat(
    api_key="your-openai-key",
    session_id="openai-chat",
    system_message="You are a helpful assistant."
).with_model("openai", "gpt-5.4")

# Using Anthropic
claude_chat = LlmChat(
    api_key="your-anthropic-key",
    session_id="claude-chat",
    system_message="You are Claude, a helpful AI assistant."
).with_model("anthropic", "claude-sonnet-4-20250514")

# Using Gemini
gemini_chat = LlmChat(
    api_key="your-gemini-key",
    session_id="gemini-chat",
    system_message="You are a helpful assistant."
).with_model("gemini", "gemini-2.5-flash")
```

Important pointers:
1. Always make your own database for storing chat history.
2. Below is a list of available models, if model asked for is not in the provided list, most likely it's a newer model that's just being released and may not be listed here. Please ask user explicitly that this model is not listed with us and if they still want to use this model. Please ask for provider and model name and try with that.

<available_models>
{{LLM_INTEGRATION_CHAT_WITH_FILES_ATTACHMENTS_PLAYBOOK_V2_models}}
</available_models>

**ALWAYS ASK THE USER WHICH MODEL TO USE, SUGGEST THE ABOVE NAMES FOR EACH PROVIDER INCASE OF LLM INTEGRATION**

3. Never change the model without asking user.
4. Always double check all the model names while implementing.
5. The library above is well tested and you can always check the source code from installation source (it is installed using pip).
6. Please ensure you store messages in database to make the chat persistent. Message history should be managed independently out of this library.
7. Streaming is mandatory — use `stream_message()` for all user-facing responses. `send_message()` is only for explicit non-streaming requests.
8. When serving the stream over HTTP, set `X-Accel-Buffering: no` on the SSE response — without it nginx / Cloudflare buffers tokens into one chunk, not word by word.
9. **Task budget minimum is 20,000 tokens on Opus 4.7.** If a user requests less, set it to 20,000 and tell the user that 20,000 is the floor (values below return a 400 error from the API).
10. **Task budgets are Opus 4.7-only and enabled by default at 200,000 tokens per task.** Not available on OpenAI, Gemini, or other Claude models. Do not communicate task budget details to end users.

### File Attachments
```python
from platformintegrations.llm.chat import FileContentWithMimeType, LlmChat

# NOTE: FileContentWithMimeType is only supported with Gemini models
chat = LlmChat(
    api_key="your-gemini-api-key",
    session_id="unique-session-id",
    system_message="You are a helpful assistant."
).with_model("gemini", "gemini-2.5-flash")  # Must use Gemini model

# Text file
text_file = FileContentWithMimeType(
    file_path="/path/to/document.txt",
    mime_type="text/plain"
)

# CSV file
csv_file = FileContentWithMimeType(
    file_path="/path/to/data.csv",
    mime_type="text/csv"
)

# PDF file
pdf_file = FileContentWithMimeType(
    file_path="/path/to/document.pdf",
    mime_type="application/pdf"
)

# Create a message with multiple file attachments and stream the response
from platformintegrations.llm.chat import TextDelta, StreamDone

async for ev in chat.stream_message(UserMessage(
    text="Please analyze these files.",
    file_contents=[text_file, csv_file, pdf_file]
)):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break
```

Example:
### Data Analysis
```python
from platformintegrations.llm.chat import FileContentWithMimeType, TextDelta, StreamDone

# CSV data file
data_file = FileContentWithMimeType(
    file_path="/path/to/data.csv",
    mime_type="text/csv"
)

# Analyze data
async for ev in chat.stream_message(UserMessage(
    text="Analyze this CSV data and provide insights",
    file_contents=[data_file]
)):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break
```

Example:
### Document Comparison
```python
from platformintegrations.llm.chat import FileContentWithMimeType, TextDelta, StreamDone

# Create file content objects
text_file = FileContentWithMimeType(
    file_path="/path/to/document.txt",
    mime_type="text/plain"
)

pdf_file = FileContentWithMimeType(
    file_path="/path/to/report.pdf",
    mime_type="application/pdf"
)

# Analyze multiple documents
async for ev in chat.stream_message(UserMessage(
    text="Compare these documents and summarize the key differences",
    file_contents=[text_file, pdf_file]
)):
    if isinstance(ev, TextDelta):
        yield ev.content
    elif isinstance(ev, StreamDone):
        break
```

========================================================================

## Streaming

Use `stream_message()` instead of `send_message()` to deliver tokens to the UI as they arrive. File attachments are passed the same way.

```python
from platformintegrations.llm.chat import TextDelta, StreamDone

async for ev in chat.stream_message(UserMessage(text="Analyse this file.", file_contents=[pdf_file])):
    if isinstance(ev, TextDelta):
        yield ev.content      # write to SSE / WebSocket
    elif isinstance(ev, StreamDone):
        break
```

Return the loop above as SSE with proxy buffering disabled, or nginx / Cloudflare buffers the response and tokens arrive in chunks, not word by word:

```python
return StreamingResponse(event_generator(), media_type="text/event-stream",
                         headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
```

## Advanced Configuration: Task Budgets & Adaptive Thinking (Anthropic only)

**For `claude-opus-4-7`, we enable task budgets by default at 200,000 tokens per task.** A task budget gives Claude a soft cap on how much it can spend across a single task (thinking + tool calls + output) — costs stay predictable and the model paces itself as the budget is consumed. Add the `anthropic-beta: task-budgets-2026-03-13` header to your `LlmChat` setup.

Example:

```python
chat = (
    LlmChat(
        api_key=PLATFORM_LLM_KEY,
        session_id="unique-session-id",
        system_message="You are a helpful assistant.",
        custom_headers={"anthropic-beta": "task-budgets-2026-03-13"},
    )
    .with_model("anthropic", "claude-opus-4-7")
    .with_params(
        extra_body={
            "output_config": {
                "task_budget": {"type": "tokens", "total": 200000},
                "effort": "high",
            },
        },
        max_tokens=64000,
    )
)
```

### Optional: turn on adaptive thinking

Adaptive thinking lets Claude decide how deeply to reason on each request — lighter on easy questions, deeper on hard ones. It's **off by default** on `claude-opus-4-7`; enable it only when a user explicitly asks for it. To turn it on, add `thinking={"type": "adaptive"}` to `extra_body`:

```python
.with_params(
    extra_body={
        "output_config": {
            "task_budget": {"type": "tokens", "total": 200000},
            "effort": "high",
        },
        "thinking": {"type": "adaptive"},
    },
    max_tokens=64000,
)
```

Quick reference:
- **`effort`** (default: `"high"`) — `"low"`, `"medium"`, `"high"`, `"xhigh"` (Opus 4.7 only), `"max"`. Higher = more reasoning per step.
- **`thinking.type: "adaptive"`** is off by default on Opus 4.7. If enabled, it's the only thinking mode the model accepts — manual budgets (`type: "enabled"`) return a 400 error.

</setup>
