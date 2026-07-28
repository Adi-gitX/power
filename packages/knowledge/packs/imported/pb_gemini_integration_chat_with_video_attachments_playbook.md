GEMINI_INTEGRATION_CHAT_WITH_VIDEO_ATTACHMENTS_PLAYBOOK**
### Video Attachments (Gemini Only)
**1. Implementation Strategy:
- Use chunked file uploads to bypass proxy limits
- Store uploaded files in a persistent location
- Implement proper error handling for each phase
- Show detailed progress indicators for all operations
2. Test Parameters:
- Will test with a 17MB video file
- Need to handle direct upload from users' devices**

```python
from platformintegrations.llm.chat import FileContentWithMimeType

## Initialize chat with Gemini
chat = LlmChat(
    api_key="your-gemini-api-key",
    session_id="video-analysis",
    system_message="You are a helpful assistant."
).with_model("gemini", "gemini-3.1-pro-preview")  # Must use Gemini model

## Video file
video_file = FileContentWithMimeType(
    file_path="/path/to/video.mp4",
    mime_type="video/mp4"
)

## Create a message with video attachment
user_message = UserMessage(
    text="Please analyze this video.",
    file_contents=[video_file]
)

try:
    ## This will only work with Gemini provider
    response = await chat.send_message(user_message)
    print(response)
except ChatError as e:
    print(f"Error: Video analysis is only supported with Gemini provider - {{str(e)}}")
```

Example:
```python
from platformintegrations.llm.chat import FileContentWithMimeType, LlmChat

# Initialize chat with Gemini
chat = LlmChat(
    api_key="your-gemini-api-key",
    session_id="video-analysis",
    system_message="You are a helpful assistant."
).with_model("gemini", "gemini-3.1-pro-preview")  # Must use Gemini model

# Video file
video_file = FileContentWithMimeType(
    file_path="/path/to/video.mp4",
    mime_type="video/mp4"
)

# Analyze video
try:
    response = await chat.send_message(UserMessage(
        text="Analyze this video and describe what's happening",
        file_contents=[video_file]
    ))
    print(f"Video analysis: {{response}}")
except ChatError as e:
    print(f"Error: Video analysis requires Gemini provider - {{str(e)}}")
```

=================================================================================================