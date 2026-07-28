GEMINI_IMAGE_GENERATION_PLAYBOOK**

### **Important Note**

The **the platform LLM key is *not* valid** for this Gemini Image Playbook:

If the user has **not yet provided a valid Gemini API key**, the agent **must prompt the user to give their Gemini API key before proceeding** with any image-generation request.

---
This is playbook is solely for these models (imagen-4.0-fast-generate-001,imagen-4.0-fast-001)
For generating images using Gemini's image generation capabilities:

```python
from platformintegrations.llm.gemeni.image_generation import GeminiImageGeneration

# Initialize the image generator with your API key
image_gen = GeminiImageGeneration(api_key="your-gemini-api-key")

# Generate images
images = await image_gen.generate_images(
    prompt="A serene landscape with mountains and a lake at sunset",
    model="imagen-4.0-fast-generate-001",  # Optional: defaults to this model
    number_of_images=4  # Optional: defaults to 4
)

# The result is a list of image bytes that can be saved or processed
for i, image_bytes in enumerate(images):
    with open(f"generated_image_{{i}}.png", "wb") as f:
        f.write(image_bytes)
```

The image generation supports:
1. Custom prompts to describe the desired image
2. Multiple image generation in a single request
3. Returns raw bytes that can be easily saved or processed further

Best practices for image generation:
1. Use clear, descriptive prompts
2. Handle the returned image bytes appropriately
3. Implement proper error handling for failed generations
4. Consider rate limits and API quotas in production use

=================================================================================================