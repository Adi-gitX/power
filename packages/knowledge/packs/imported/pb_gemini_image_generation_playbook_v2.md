GEMINI_IMAGE_GENERATION_PLAYBOOK

{{universal_key_context}}

## This playbook supports and uses the universal PLATFORM_LLM_KEY

## Available Models

<available_models>
{{GEMINI_IMAGE_GENERATION_PLAYBOOK_V2_models}}
</available_models>

{model_id}:
- `gemini-3.1-flash-image-preview` - Default/Latest Nano Banana model
- `gemini-3-pro-image-preview`

<setup>

## Add this line to /app/backend/.env file in a new line in case user wants universal key

`PLATFORM_LLM_KEY={platform_llm_key}`

*** IMPORTANT NOTE ***
Always make sure to import and use load_dotenv before using any environment variables.
MAKE SURE YOU ALWAYS CREATE A NEW INSTANCE OF LlmChat for each chat session.

## Basic Image Generation

```python
import asyncio
import os
import base64
from dotenv import load_dotenv
from platformintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# Load environment variables first
load_dotenv()

# Initialize chat with API key from environment
api_key = os.getenv("PLATFORM_LLM_KEY")

chat = LlmChat(api_key=api_key, session_id="unique-session-id", system_message="You are a helpful AI assistant")

chat.with_model("gemini", {model_id}).with_params(modalities=["image", "text"])

# Generate image from text prompt
msg = UserMessage(
    text="Create a picture of a cat eating a nano-banana in a fancy restaurant under the gemini constellation",
)

# Send message and get response (text and images)
text, images = await chat.send_message_multimodal_response(msg)

print(f"Text response: {text}")
if images:
    print(f"Generated {len(images)} image(s)")
    for i, img in enumerate(images):
        print(f"Image {i}: {img['mime_type']}")
        # Decode base64 data to bytes before saving
        image_bytes = base64.b64decode(img['data'])
        with open(f"generated_image_{i}.png", "wb") as f:
            f.write(image_bytes)
        print(f"Saved as generated_image_{i}.png")
```

## Image Editing with Reference Image

```python
from dotenv import load_dotenv
import os
import base64
from platformintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

# Load and encode reference image
with open("cat_image.jpg", "rb") as f:
    reference_image_bytes = f.read()
    image_base_64 = base64.b64encode(reference_image_bytes).decode('utf-8')

api_key = os.getenv("PLATFORM_LLM_KEY")
chat = LlmChat(api_key=api_key, session_id="unique-session-id", system_message="You are a helpful AI assistant")
chat.with_model("gemini", {model_id}).with_params(modalities=["image", "text"])

# Edit image with reference
msg = UserMessage(
    text="Use the cat in this image and place it on a mars orbit with stars in the background",
    file_contents=[ImageContent(image_base_64)]
)

text, images = await chat.send_message_multimodal_response(msg)

if images:
    for i, img in enumerate(images):
        image_bytes = base64.b64decode(img['data'])
        with open(f"edited_image_{i}.png", "wb") as f:
            f.write(image_bytes)
        print(f"Edited image saved as edited_image_{i}.png")
```

</setup>

<important_pointers>

Important pointers:

1. **API Key**: Use `PLATFORM_LLM_KEY` from environment variables
2. **Image Format**: Images are returned as base64-encoded strings (LlmChat)
3. **Base64 Encoding**: When providing reference images, encode them to base64 first
4. **Chat History**: When using LlmChat, manage message history in your own database for persistence
5. **Base64 Logging**: NEVER log, print, or display complete base64 image strings. Only print the first 10 characters for testing purposes (e.g., `data:image...`). Logging full base64 strings will cause context window limit errors and consume excessive tokens.

</important_pointers>
