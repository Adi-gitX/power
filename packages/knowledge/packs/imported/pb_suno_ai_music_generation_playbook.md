SUNO_AI_MUSIC_GENERATION_PLAYBOOK

## This playbook enables AI-powered music generation using Suno API

## Overview
Suno AI generates complete songs (vocals + instrumentals) from text prompts. Users describe the music they want, and Suno creates a full song with lyrics, melody, and production.

<setup>

## Environment Setup

*** IMPORTANT: ASK USER FOR SUNO API KEY ***
Suno AI is NOT supported by the universal PLATFORM_LLM_KEY. 
Ask the user to provide their own Suno API key from sunoapi.org before proceeding.
Always load environment variables BEFORE importing the suno service module. Import order matters!

Add to `/app/backend/.env`:
```
SUNO_API_KEY={user_provided_suno_api_key}
```

## Suno API Reference

Base URL: `https://api.sunoapi.org/api/v1`

Authentication:
```
Authorization: Bearer {SUNO_API_KEY}
Content-Type: application/json
```

### 1. Generate Music
Endpoint: `POST /generate`

Request:
```json
{
  "prompt": "A cheerful pop song about summer",
  "customMode": false,
  "instrumental": false,
  "model": "V4_5ALL",
  "callBackUrl": "https://webhook.site/placeholder"
}
```

Response:
```json
{
  "code": 200,
  "msg": "success",
  "data": { "taskId": "0a8eebdf5be85be0e6a29280f2264137" }
}
```

### 2. Check Generation Status
Endpoint: `GET /generate/record-info?taskId={taskId}`

Response (Success):
```json
{
  "code": 200,
  "data": {
    "taskId": "xxx",
    "status": "FIRST_SUCCESS",
    "response": {
      "sunoData": [{
        "id": "93bab5be-c803-40ed-9089-e6413e2ebd6e",
        "audioUrl": "https://musicfile.api.box/xxx.mp3",
        "streamAudioUrl": "https://musicfile.api.box/xxx",
        "imageUrl": "https://musicfile.api.box/xxx.jpeg",
        "title": "Sunburnt Smiles",
        "duration": 148.04,
        "prompt": "[Full lyrics]",
        "tags": "pop, Bright, bouncy..."
      }]
    }
  }
}
```

## Available Models

- `V4_5ALL` - Latest model (chirp-auk-turbo) - Best quality

</setup>

<important_pointers>

## Important Pointers

1. Callback URL Required: The Suno API requires a `callBackUrl` parameter. Use a placeholder webhook URL if you don't need real-time notifications.

2. Response Data Structure: Song data is nested at `data.response.sunoData[0]`. Always parse from this path.

3. Generation Time: Songs take 1-2 minutes to generate. Implement polling (every 10 seconds) on the frontend to check status.

4. Status During Processing: The API may return 404 while a song is still generating. Handle this gracefully by showing "processing" status.

5. Two Songs Per Request: Suno generates 2 song variations per request. The response contains both in `sunoData` array. Typically you save only the first one (`sunoData[0]`), but you can save both if needed.

6. Database Storage: Store `task_id` immediately after generation starts. Update with audio/image URLs when status becomes FIRST_SUCCESS.

7. MongoDB _id Exclusion: Always use `{"_id": 0}` projection when querying songs to avoid serialization issues.

8. Credits: Each generation costs ~10-12 credits. Consider implementing credit tracking and user limits.

9. CORS Configuration: Ensure backend allows requests from your frontend origin with `credentials=True` if using cookies.

10. API Returns 200 for Errors: The Suno API returns HTTP 200 even for errors. Always check the `code` field in the response body (code 200 = success, other values = error).

</important_pointers>
