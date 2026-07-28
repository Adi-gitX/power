OPENAI_TEXT_TO_SPEECH_INTEGRATION_PLAYBOOK

{{universal_key_context}}

<setup>
## Setup
Integrating OpenAI's Text-to-Speech (TTS) API for converting text to audio

Add this line to /app/backend/.env file in case user wants universal key:
```
PLATFORM_LLM_KEY={platform_llm_key}
```

*** IMPORTANT NOTE ***
Always make sure to import and use load_dotenv before using any environment variables

## Basic Usage

```python
from platformintegrations.llm.openai import OpenAITextToSpeech
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize with API key
tts = OpenAITextToSpeech(api_key=os.getenv("PLATFORM_LLM_KEY"))

# Generate speech
audio_bytes = await tts.generate_speech(
    text="Hello, this is a text-to-speech test!",
    model="tts-1",
    voice="alloy"
)

# Save to file
with open("output.mp3", "wb") as f:
    f.write(audio_bytes)
```

## Configuration Options

```python
# Model: tts-1 (fast) or tts-1-hd (high quality)
audio = await tts.generate_speech(text="Hello", model="tts-1-hd")

# Voice: Choose from 9 available voices
audio = await tts.generate_speech(text="Hello", voice="shimmer")

# Speed: 0.25 to 4.0 (default 1.0)
audio = await tts.generate_speech(text="Hello", speed=1.5)

# Format: mp3, opus, aac, flac, wav, pcm
audio = await tts.generate_speech(text="Hello", response_format="wav")
```

## Advanced Usage

### Base64 Output (for embedding in HTML/JSON)

```python
audio_base64 = await tts.generate_speech_base64(text="Hello!")
html = f'<audio src="data:audio/mp3;base64,{audio_base64}"></audio>'
```

### With Error Handling

```python
try:
    audio_bytes = await tts.generate_speech(
        text="Your text here",
        model="tts-1",
        voice="nova"
    )
    with open("output.mp3", "wb") as f:
        f.write(audio_bytes)
except ValueError as e:
    print(f"Validation error: {e}")
except Exception as e:
    print(f"Generation failed: {e}")
```

### With Custom Headers

```python
tts = OpenAITextToSpeech(
    api_key=api_key,
    custom_headers={"X-App-ID": "my-app"}
)
```

</setup>

<important_pointers>
Important pointers:

1. Text length limited to **4096 characters** per request. Split longer content into chunks.
2. Always store generated audio in your own storage system.
3. Supports both OpenAI API keys and the platform LLM keys (starting with 'sk-platform-').
4. Audio returned as bytes by default. Use `generate_speech_base64()` for base64 strings.
5. Always implement proper error handling.
6. **Always inform the user about available models first:** When a user requests TTS integration, tell them we support 2 OpenAI TTS models: `tts-1` (standard quality, faster, cheaper) and `tts-1-hd` (high-definition quality, better audio). Let them choose which model fits their use case. Then implement using the platformintegrations library code shown above - do NOT perform web research. **Exception:** If the user specifically requests a different OpenAI TTS model (e.g., gpt-4o-mini-tts or any other model not listed), then perform web research to check if it's a newer model and inform the user accordingly.

<available_options>
**Models:**
- `tts-1` - Standard quality, faster
- `tts-1-hd` - HD quality, slower

**Voices (9 available):**
- `alloy` - Neutral, balanced
- `ash` - Clear, articulate
- `coral` - Warm, friendly
- `echo` - Smooth, calm
- `fable` - Expressive, storytelling
- `nova` - Energetic, upbeat
- `onyx` - Deep, authoritative
- `sage` - Wise, measured
- `shimmer` - Bright, cheerful

**Formats:** mp3 (default), opus, aac, flac, wav, pcm

**Speed:** 0.25 to 4.0 (default: 1.0)
</available_options>

**Best Practices:**
- Use `tts-1` for real-time apps (faster, cheaper)
- Use `tts-1-hd` for podcasts/audiobooks (higher quality)
- Cache generated audio to reduce costs
- Test different voices for your use case

</important_pointers>
