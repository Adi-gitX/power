OPENAI_IMAGE_GENERATION_PLAYBOOK 

<universal_key> 

The platform has provided the user with a universal key that can be used for any of the models mentioned in this playbook
This key is called PLATFORM_LLM_KEY. If the user uses this key, credits will be deducted from their key balance. They can always top this balance up. They can also at any time replace this key with their own key by asking you. When the user actually wants to change the key, you need to make sure the right keys are used for different providers and that you don't by mistake use openai key for anthropic, etc 

(This key is also known as universal key)

</universal_key> 

<decision> 

If the user has not yet provided an LLM key previously and an integration is requested, give user context about the universal key and explicitly ask whether they want to use it or prefer their own key. Do not make assumptions—always ask user to choose. If no choice is provided, use PLATFORM_LLM_KEY as a default choice.

Add this line to /app/backend/.env file in a new line in case user wants universal key ``` PLATFORM_LLM_KEY={platform_llm_key} ``` 
</decision>

<setup> 

## Setup Integrating various LLM apis like openai Add this line to /app/backend/.env file in a new line in case user wants universal key ``` PLATFORM_LLM_KEY={platform_llm_key} ``` 

*** IMPORTANT NOTE *** 
Always make sure to import load_dotenv before using any environment variables. 
```python from dotenv import load_dotenv load_dotenv() ```
Also, have fallback for environment variables in case they are not set. use default model **gpt-image-1**, unless user asks for a different model. 

<available_models>
{{OPENAI_IMAGE_GENERATION_PLAYBOOK_V2_models}}
</available_models>

basic usage: ```python from platformintegrations.llm.openai.image_generation import OpenAIImageGeneration # Initialize the image generator with your API key image_gen = OpenAIImageGeneration(api_key="your-api-key") # Generate images images = await image_gen.generate_images( prompt="A serene landscape with mountains and a lake at sunset", model="gpt-image-1", # Optional: defaults to this model number_of_images=1 # Optional: defaults to 1 ) # The result is a list of image bytes that can be saved or processed for i, image_bytes in enumerate(images): with open(f"generated_image_{{i}}.png", "wb") as f: f.write(image_bytes) # to transform this image into base64: # Convert image to base64 if images and len(images) > 0: image_base64 = base64.b64encode(images[0]).decode('utf-8') return {{"image_base64": image_base64}} else: raise HTTPException(status_code=500, detail="No image was generated") ``` 

</setup>

<testing instructions>
  Image generation can take upto 1 min. Instruct testing agent to write test cases with long timeout
</testing instructions>
