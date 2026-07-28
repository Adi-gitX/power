OPENAI_REALTIME_VOICE_MODE_PLAYBOOK**

** IMPORTANT **
It **does not** use or support `PLATFORM_LLM_KEY` (even though it uses OpenAI).
It requires **direct OpenAI credentials**:
  - `OPENAI_API_KEY` (a project key with Realtime / Voice access enabled)

## If the user does not have OpenAI credentials yet, instruct them to: 
  1. Go to the **OpenAI Platform Dashboard**.
  2. Create or select a **Project** and generate an **API key** with access to Realtime / Voice features.
  3. Add it to their environment:
  
Follow below integration strictly and it will work.

```python
from platformintegrations.llm.openai import OpenAIChatRealtime, UserMessage

# Initialize the chat with your API key and register fastapi router
chat = OpenAIChatRealtime(api_key="your-api-key")
router = APIRouter()
OpenAIChatRealtime.register_openai_realtime_router(router, chat)
app.include_router(router, prefix="/api/v1")
```

Then use this with WebRtc in Frontend, Javascript example:

```js
class RealtimeAudioChat {{
    constructor() {{
        this.peerConnection = null;
        this.dataChannel = null;
        this.audioElement = null;
    }}

    async init() {{
        try {{
            // Get session from backend
            const tokenResponse = await fetch("/{{api_prefix_in_base_router}}/realtime/session", {{
                method: "POST",
                headers: {{
                    "Content-Type": "application/json"
                }}
            }});
            const data = await tokenResponse.json();
            if (!data.client_secret?.value) {{
                throw new Error("Failed to get session token");
            }}

            // Create and set up WebRTC peer connection
            this.peerConnection = new RTCPeerConnection();
            this.setupAudioElement();
            await this.setupLocalAudio();
            this.setupDataChannel();

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // Send offer to backend and get answer
            const response = await fetch("{{api_prefix_in_base_router}}/realtime/negotiate", {{
                method: "POST",
                body: offer.sdp,
                headers: {{
                    "Content-Type": "application/sdp"
                }}
            }});

            const {{ sdp: answerSdp }} = await response.json();
            const answer = {{
                type: "answer",
                sdp: answerSdp
            }};

            await this.peerConnection.setRemoteDescription(answer);
            console.log("WebRTC connection established");
        }} catch (error) {{
            console.error("Failed to initialize audio chat:", error);
            throw error;
        }}
    }}

    setupAudioElement() {{
        this.audioElement = document.createElement("audio");
        this.audioElement.autoplay = true;
        document.body.appendChild(this.audioElement);

        this.peerConnection.ontrack = (event) => {{
            this.audioElement.srcObject = event.streams[0];
        }};
    }}

    async setupLocalAudio() {{
        const stream = await navigator.mediaDevices.getUserMedia({{ audio: true }});
        stream.getTracks().forEach(track => {{
            this.peerConnection.addTrack(track, stream);
        }});
    }}

    setupDataChannel() {{
        this.dataChannel = this.peerConnection.createDataChannel("oai-events");
        this.dataChannel.onmessage = (event) => {{
            console.log("Received event:", event.data);
            // Handle different event types here
        }};
    }}

    // Add any additional methods for handling specific events or interactions
}}

// Export for use in other files
export default RealtimeAudioChat;
```

=================================================================================================