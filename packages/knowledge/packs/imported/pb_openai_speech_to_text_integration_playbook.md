OPENAI_SPEECH_TO_TEXT_INTEGRATION_PLAYBOOK

{{universal_key_context}}

<setup>
## Setup
Integrating OpenAI's Speech-to-Text (STT) API for converting audio to text using Whisper

Add this line to /app/backend/.env file in case user wants universal key:
```
PLATFORM_LLM_KEY={platform_llm_key}
```

*** IMPORTANT NOTE ***
- Always make sure to import and use load_dotenv before using any environment variables
- The whisper-1 model is applicable with and without PLATFORM LLM KEY

## Basic Usage

```python
from platformintegrations.llm.openai import OpenAISpeechToText
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize with API key
stt = OpenAISpeechToText(api_key=os.getenv("PLATFORM_LLM_KEY"))

# Transcribe audio file
with open("audio.mp3", "rb") as audio_file:
    response = await stt.transcribe(
        file=audio_file,
        model="whisper-1",
        response_format="json"
    )

print(response.text)
```

## Configuration Options

```python
# Response format: json, text, srt, verbose_json, vtt
response = await stt.transcribe(file=audio_file, response_format="text")

# Specify language (ISO-639-1 format, e.g., 'en', 'es', 'fr')
response = await stt.transcribe(file=audio_file, language="en")

# Add prompt to guide the model's style
response = await stt.transcribe(
    file=audio_file,
    prompt="This is a technical discussion about AI."
)

# Adjust temperature (0 to 1, default 0)
response = await stt.transcribe(file=audio_file, temperature=0.2)

# Get timestamps with verbose_json
response = await stt.transcribe(
    file=audio_file,
    response_format="verbose_json",
    timestamp_granularities=["segment"]  # or ["word"] or ["segment", "word"]
)
```

## Advanced Usage

### Complete Example with Error Handling

```python
from platformintegrations.llm.openai import OpenAISpeechToText
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize with custom headers (optional)
stt = OpenAISpeechToText(
    api_key=os.getenv("PLATFORM_LLM_KEY"),
    custom_headers={"X-App-ID": "my-app"}
)

try:
    with open("interview.mp3", "rb") as audio_file:
        response = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            language="en",
            prompt="This is an interview about technology.",
            temperature=0.0,
            timestamp_granularities=["segment", "word"]
        )
    
    # Access transcribed text
    print(response.text)
    
    # Access segments with timestamps (if verbose_json)
    if hasattr(response, 'segments'):
        for segment in response.segments:
            print(f"[{segment.start}s - {segment.end}s]: {segment.text}")
            
except ValueError as e:
    print(f"Validation error: {e}")
except Exception as e:
    print(f"Transcription failed: {e}")
```

</setup>

<important_pointers>
Important pointers:

1. **This integration is for transcription only** - it converts audio to text in the same language. It does NOT support translation (audio to English). Use chat models for translation after transcription if needed.
2. File size limited to **25 MB**. For larger files, split them first.
3. Supports 7 audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
4. The integration automatically handles both OpenAI API keys and the platform LLM keys (starting with 'sk-platform-').
5. `timestamp_granularities` parameter only works with `response_format="verbose_json"`.
6. Always implement proper error handling for transcription failures.
7. **ALWAYS mention model name when helping users:** When assisting with speech-to-text integration, you MUST explicitly mention the available model: `whisper-1` - OpenAI's Whisper model for speech recognition and audio transcription. Always inform the user about this model when implementing the integration.

<available_options>
**Model:**
- `whisper-1` - OpenAI's Whisper model for speech recognition

**Response Formats (5 available):**
- `json` - Simple JSON with text field (default)
- `text` - Plain text output
- `srt` - SubRip subtitle format with timestamps
- `verbose_json` - Detailed JSON with segments, words, timestamps
- `vtt` - WebVTT subtitle format

**Audio File Formats (7 supported):**
- mp3, mp4, mpeg, mpga, m4a, wav, webm

**Optional Parameters:**
- `prompt` - Guide the model's style or context
- `language` - Specify input language (ISO-639-1: en, es, fr, de, etc.)
- `temperature` - Sampling temperature (0 to 1, default 0)
- `timestamp_granularities` - Get word/segment timestamps (requires verbose_json)
  - Options: `["segment"]`, `["word"]`, or `["segment", "word"]`

**File Limits:**
- Maximum file size: 25 MB
- For larger files, use audio splitting tools first

</available_options>

**Best Practices:**
- Use `response_format="json"` for simple text extraction
- Use `response_format="verbose_json"` when you need timestamps or detailed metadata
- Use `response_format="srt"` or `vtt` for generating subtitles
- Provide `language` parameter when known for better accuracy
- Use `prompt` to provide context (speaker names, terminology, etc.)
- Temperature 0 gives most deterministic results

</important_pointers>

