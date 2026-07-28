GEMINI_VIDEO_GENERATION_PLAYBOOK

## Important Context ##
- It **does not** use or support `PLATFORM_LLM_KEY`.
- It requires Gemini / Google AI credentials:
  - `GEMINI_API_KEY`

    ** Instruction for the User **
 If the user does not have Gemini credentials yet, instruct them to:
  1. Go to the **Google AI Studio** or **Google Cloud Console**.
  2. Create or select a **project** with access to Gemini video generation.
  3. Generate an **API key** for Gemini.
  4. Add it to their environment:
     - `GEMINI_API_KEY=<their-gemini-api-key>`

*** IMPORTANT NOTE *** 
Always make sure to import and use load_dotenv before using any environment variables
MAKE SURE YOU ALWAYS CREATE A NEW INSTANCE OF GeminiVideoGeneration for each video generation changes

## Playbook for TEXT to video generation

```
import asyncio
import sys
import os
import traceback
sys.path.insert(0, os.path.abspath(''))

from platformintegrations.llm.gemeni.video_generation import GeminiVideoGeneration


async def test_genai_sdk():

    video_gen = GeminiVideoGeneration(
        api_key=os.environ['PLATFORM_LLM_KEY']
    )

    print(f'Base URL: {video_gen.base_url}')

    prompt = 'A cat playing piano in a jazz club'
    print(f'🎬 Generating video with genai SDK and prompt: {prompt}')

    try:
        # Test the genai SDK method
        video_bytes = video_gen.text_to_video_genai_sdk(prompt, max_wait_time=600, output_path='/app/genai_test_video.mp4')

        if video_bytes:
            print(f'✅ Video generation completed successfully!')
            print(f'📁 Video bytes size: {len(video_bytes)}')
            print(f'📁 Video saved to: genai_test_video.mp4')
        else:
            print('❌ Video generation failed')

    except Exception as e:
        print(f'❌ Error: {str(e)}')
        traceback.print_exc()

```

## Playbook for Image to video generation

```

"""
Quick test to generate video from user's image with prompt: make the man smile
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from platformintegrations.llm.gemeni.video_generation import GeminiVideoGeneration

# Load environment variables
load_dotenv()

def main():
    # Get API key
    api_key = os.getenv("PLATFORM_PROD_KEY")
    if not api_key:
        print("❌ PLATFORM_PROD_KEY not set in .env file")
        return

    # Set prod proxy URL
    os.environ["INTEGRATION_PROXY_URL"] = "https://integrations.yourplatform.com"

    # Create video generator
    video_gen = GeminiVideoGeneration(api_key=api_key)

    # Input image path
    image_path = "/Users/lakshya/platform/platform_integrations/tests/llm/gemeni/test_assets/1746273149949.jpeg"

    # Output path
    output_path = "/Users/lakshya/platform/platform_integrations/tests/llm/gemeni/test_output/girl_hugs_man.mp4"

    prompt = "make this man smile"

    print(f"🎬 Starting video generation...")
    print(f"📷 Input image: {image_path}")
    print(f"💬 Prompt: {prompt}")
    print(f"📁 Output: {output_path}")
    print(f"⏳ This will take about 2-3 minutes...\n")

    # Generate video
    video_bytes = video_gen.text_to_video_genai_sdk(
        prompt=prompt,
        max_wait_time=600,
        output_path=output_path,
        image_path=image_path,
        mime_type="image/jpeg"
    )

    if video_bytes:
        print(f"\n✅ SUCCESS! Video generated successfully!")
        print(f"📊 Video size: {len(video_bytes) / 1024 / 1024:.2f} MB")
        print(f"💾 Saved to: {output_path}")
    else:
        print(f"\n❌ Failed to generate video")

if __name__ == "__main__":
    main()


```

</setup> 
<important_pointers> 
Important pointers: 
1. Please ensure you are following the playbook correctly. 
</important_pointers>