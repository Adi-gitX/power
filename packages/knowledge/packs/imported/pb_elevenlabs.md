Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments for your specific environment. Main Agent E1 should test these api before calling testing_agent**

# ElevenLabs Voice Cloning Integration Playbook for FastAPI and React Applications

<instructions>
1. USE the correct Eleven Labs SDK methods and models while making requests
eg: ❌ Wrong- audio_generator = client.generate() ✅ Correct- client.text_to_speech.convert()
eg: ❌ Wrong- transcription = client.transcribe() ✅ Correct- client.speech_to_text.convert()
Code snippets for method and model use are provided below.
2. SDK Method names do not change for Async Eleven Labs so use the same ones.
</instructions>

## Required API Keys

- **ElevenLabs API Key**: Obtain from https://elevenlabs.io/app/settings/api-keys
- Store securely in environment variables, never hardcode

*** IMPORTANT NOTE ***
- PLATFORM LLM KEY is not applicable for Eleven Labs

## Core System Architecture

### Backend Infrastructure (Python/FastAPI)

from elevenlabs import ElevenLabs

client = ElevenLabs(
    api_key="YOUR_API_KEY",
)

- **Voice Processing Pipeline**: Implements async endpoints for voice cloning (POST `/voices/clone`), TTS generation (POST `/tts/generate`), and audio conversion (POST `/audio/convert`)
- **MongoDB GridFS**: Stores voice samples and generated audio as binary chunks with metadata indexing

```python
# Audio schema model
class AudioFile(BaseModel):
    voice_id: UUID
    source_type: Literal["clone", "tts", "upload"]
    format: str  # mp3, wav, ogg
    duration: float
    storage_path: str

```

### Frontend Architecture (React/Typescript)

- **Voice Management Dashboard**: File uploader with drag-and-drop support and audio waveform preview
- **Real-time Audio Streaming**: WebSocket integration for progressive audio playback during generation

```tsx
const { startStream, audioChunks } = useElevenLabsStream(
  apiKey,
  { voiceId: '21m00Tcm4Tlm', stability: 0.7 }
);

```

## Implementation Guide

### 1. Environment Configuration

```bash
# Backend requirements
pip install elevenlabs fastapi motor pydantic ffmpeg-python python-multipart

```

```bash
# Frontend dependencies
npm install @elevenlabs/voicekit-react react-dropzone websocket

```

### 2. Secure API Gateway Setup

```python
# FastAPI security middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

```

```python
# ElevenLabs authenticated client
from elevenlabs.client import AsyncElevenLabs

async def get_tts_client() -> AsyncElevenLabs:
    return AsyncElevenLabs(
        api_key=settings.ELEVEN_API_KEY,
        timeout=30.0,
        max_retries=3
    )

```

### 2. Fetching voices
voices_response = await client.voices.get_all()


```

### 3. Voice Cloning using ElevenLabs IVC
```python
@app.post("/voices/clone", response_model=VoiceCloneResponse)
async def clone_voice(
    files: List[UploadFile] = File(...),
    voice_name: str = Form(...),
    description: str = Form(None)
):
    client = await get_tts_client()
    # Clone the voice using ElevenLabs IVC (Instant Voice Cloning)
    voice = await client.voices.ivc.create(
        name=voice_name,
        files=[await process_upload(f) for f in files],
        description=description
    )
    # Follow <MongoDB adherence> to interact with MongoDB
    await mongo.voices.insert_one(voice.dict())
    return voice

```

### 4. TTS Endpoint
```python
@api_router.post("/tts/generate", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
 """Generate text-to-speech audio using ElevenLabs"""
 try:
  # Generate audio using ElevenLabs
  voice_settings = VoiceSettings(
   stability=request.stability,
   similarity_boost=request.similarity_boost,
   style=request.style,
   use_speaker_boost=request.use_speaker_boost
  )
  audio_generator = eleven_client.text_to_speech.convert(
   text=request.text,
   voice_id=request.voice_id,
   model_id="eleven_multilingual_v2",
   voice_settings=voice_settings
  )
  # Collect audio data
  audio_data = b""
  for chunk in audio_generator:
   audio_data += chunk
  # Convert to base64 for storage/transfer
  audio_b64 = base64.b64encode(audio_data).decode()
  # Create response
  tts_response = TTSResponse(
   audio_url=f"data:audio/mpeg;base64,{audio_b64}",
   text=request.text,
   voice_id=request.voice_id
  )
  # Save to database
  tts_dict = prepare_for_mongo(tts_response.dict())
  await db.tts_generations.insert_one(tts_dict)
  return tts_response
 except Exception as e:
  logger.error(f"Error generating TTS: {str(e)}")
  raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")
```

# 5. STT Endpoint
```python
@api_router.post("/stt/transcribe", response_model=STTResponse)
async def transcribe_audio(
 audio_file: UploadFile = File(...)
):
 """Transcribe audio file to text using ElevenLabs Speech-to-Text"""
 try:
  # Read uploaded audio file
  audio_content = await audio_file.read()
  # Transcribe using ElevenLabs Speech-to-Text
  transcription_response = eleven_client.speech_to_text.convert(
   file=io.BytesIO(audio_content),
   model_id="scribe_v1"
  )
  # Extract text from the SpeechToTextChunkResponseModel
  transcribed_text = transcription_response.text if hasattr(transcription_response, 'text') else str(transcription_response)
  # Create response
  stt_response = STTResponse(
   transcribed_text=transcribed_text,
   filename=audio_file.filename or "unknown.audio"
  )
  # Save to database
  stt_dict = prepare_for_mongo(stt_response.dict())
  await db.stt_transcriptions.insert_one(stt_dict)
  return stt_response
 except Exception as e:
  logger.error(f"Error transcribing audio: {str(e)}")
  raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")
```

### 6. Real-time TTS Streaming
@api_router.post("/tts/generate", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """Generate text-to-speech audio using a selected voice"""
    try:
        # Generate audio using ElevenLabs
        audio_stream = eleven_client.text_to_speech.stream(
            text=request.text,
            voice_id=request.voice_id,
            model="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=request.stability,
                similarity_boost=request.similarity_boost
            )
        )
        
        # Collect audio data
        audio_data = b""
        async for chunk in audio_stream:
            audio_data += chunk
        
        # Convert to base64 for storage/transfer
        audio_b64 = base64.b64encode(audio_data).decode()
        
        # Save to database
        tts_response = TTSResponse(
            audio_url=f"data:audio/mpeg;base64,{audio_b64}",
            text=request.text,
            voice_id=request.voice_id
        )
        
        tts_dict = prepare_for_mongo(tts_response)
        await db.tts_generations.insert_one(tts_dict)
        
        return tts_response
        
    except Exception as e:
        logger.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")


```

### 7. Audio Format Conversion

```python
def convert_audio(
    input_path: Path,
    output_format: str,
    bitrate: str = "192k"
) -> bytes:
    ffmpeg.input(str(input_path)).output(
        "pipe:",
        format=output_format,
        audio_bitrate=bitrate,
        loglevel="error"
    ).run()
    return stdout

```

## Testing Protocol

### Unit Test Suite

```python
# Test voice cloning
def test_voice_cloning():
    test_file = BytesIO(b"fake_audio_data")
    response = client.post(
        "/voices/clone",
        # sample.mp3 is not present in the repo. Ask user to provide it and update file location accordingly
        files={"files": ("sample.mp3", test_file)},
        data={"voice_name": "TestVoice"}
    )
    assert response.status_code == 201
    assert "voice_id" in response.json()

```


## Security Best Practices

1. **API Key Rotation**: Implement Hashicorp Vault for dynamic secret management
2. **Input Validation**:

```python
@app.post("/upload")
async def upload_voice_sample(
    file: UploadFile = File(..., content_types=["audio/mpeg", "audio/wav"])
):
    validate_audio_header(await file.read(1024))

```

1. **RBAC Controls**:

```python
@app.post("/admin/voices")
async def manage_voices(
    user: User = Depends(require_admin_role)
):
    ...

```

## Monitoring Stack

```yaml
# Prometheus config
scrape_configs:
  - job_name: 'voice_api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:8000']

# Grafana Dashboard
- API Latency (p99, p95, p50)
- Error Rate (4xx/5xx)
- Voice Cloning Success Rate
- TTS Generation Throughput

```

## Performance Optimization

1. **Caching Layer**:

```python
@lru_cache(maxsize=100)
async def get_voice_settings(voice_id: str):
    return await client.voices.get_settings(voice_id)

```

1. **Connection Pooling**:

```python
class TTSClientPool:
    def __init__(self):
        self._pool = [create_client() for _ in range(10)]

    async def get_client(self):
        return self._pool.pop()

    async def release_client(self, client):
        self._pool.append(client)

```


## Key Requirements Summary

- **ElevenLabs API Key**: Required for all voice operations
- **FFmpeg**: Required for audio format conversion
- **MongoDB**: For storing voice samples and metadata
- **WebSocket Support**: For real-time audio streaming
- **File Upload Handling**: For voice sample uploads (20-second samples)
- **Audio Format Support**: MP3, WAV, MP4 output formats
