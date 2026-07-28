# CUSTOM_AGENT_PLAYBOOK

{{universal_key_context}}

## Prerequisites

User initially does not have the `custom_agent_id`, and this feature is enabled only for selected customers. Ask the user for custom_agent_id, The user should be able to provide the `custom_agent_id`, and if they don't possess it, ask them to contact the platform at **adityakammati.workspace@gmail.com** to get their `custom_agent_id` enabled.

**IMPORTANT:** Ask user for their `custom_agent_id` (also known as `user_prompt_id`) before proceeding.


## Environment Setup

Add to `/app/backend/.env`:
```bash
PLATFORM_LLM_KEY={platform_llm_key}
PLATFORM_AGENT_ID=your_agent_id
PLATFORM_API_BASE_URL=https://api.platform.sh
MONGO_URL=mongodb://localhost:27017
DB_NAME=your_database
```

**NOTE:** Always use `load_dotenv()` before accessing environment variables.


## API Contract Overview

Agent Jobs use two main endpoints:

Start: Initiate new job; Beginning a fresh conversation
resume: Continue existing job; When agent status is `requires_input` and needs user clarification 


## Budget

The `budget` parameter is specified in **credits** (default: 50). Budget exhaustion only occurs if the user has hit the limit of their total credit balance on their platform account.

`task` is the requirement you want to pass to the agent to work on, this is specific to the work you want the agent to do. This will be the key problem statement, that the custom agent will solve.

## Basic Usage - Start Agent Job
```python
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def start_agent_task(task: str, budget: float = 50.0):
    base_url = os.getenv("PLATFORM_API_BASE_URL")
    agent_id = os.getenv("PLATFORM_AGENT_ID")
    api_key = os.getenv("PLATFORM_LLM_KEY")

    url = f"{base_url}/custom-agent/api/v1/agents/{agent_id}/start"
    headers = {
        "X-the platform-Key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "task": task,
        "budget": budget,
        "webhook_url": "https://your-app.com/api/webhooks/custom-agent"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()  # {"status": "queued", "job_id": "uuid"}
```


## Resume Conversation

Use this endpoint when a Job has status `requires_input` and the agent needs user clarification to continue.
```python
async def resume_agent_task(job_id: str, task: str):
    base_url = os.getenv("PLATFORM_API_BASE_URL")
    agent_id = os.getenv("PLATFORM_AGENT_ID")
    api_key = os.getenv("PLATFORM_LLM_KEY")

    url = f"{base_url}/custom-agent/api/v1/agents/{agent_id}/resume"
    headers = {
        "X-the platform-Key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "job_id": job_id,
        "task": task,
        "webhook_url": "https://your-app.com/api/webhooks/custom-agent"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()
```

## Webhook Handler (REQUIRED)

Whenever the agent completes its work, it responds asynchronously via webhooks. You must set up a consumption endpoint with proper polling mechanisms.

**Agent Job typically take 10–30 minutes to complete.** Set polling intervals and UI expectations accordingly.
```python
from fastapi import Request
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

@app.post("/api/webhooks/custom-agent")
async def receive_webhook(request: Request):
    delivery_id = request.headers.get("x-delivery-id")
    payload = await request.json()

    # Prevent duplicate processing
    if delivery_id:
        existing = await db.events.find_one({"delivery_id": delivery_id})
        if existing:
            return {"status": "already_processed"}

    # Store event in MongoDB
    event = {
        "event_id": str(uuid.uuid4()),
        "job_id": payload.get("job_id"),
        "delivery_id": delivery_id,
        "status": payload.get("status"),  # "completed", "error", "requires_input"
        "message": payload.get("message"),
        "preview_url": payload.get("preview_url"),
        "timestamp": datetime.now(timezone.utc)
    }

    await db.events.insert_one(event)

    # Update job status
    if payload.get("job_id"):
        await db.jobs.update_one(
            {"job_id": payload["job_id"]},
            {"$set": {"status": payload["status"], "updated_at": datetime.now(timezone.utc)}}
        )

    return {"status": "success"}
```

## Poll for Events (Frontend)

Frontend must poll for webhook data since responses don't come directly to client. **Set a maximum polling duration of 2 hour** — if no terminal status is received by then, stop polling and display a timeout message.
```javascript
// After starting Job
const response = await axios.post(`${API_URL}/api/agent/start`, {
  task: "Create a dark theme",
  budget: 50.0
});

const jobId = response.data.job_id;
const MAX_POLL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hour
const startTime = Date.now();

// Poll every 3 seconds for webhook events
const pollInterval = setInterval(async () => {
  // Timeout after 2 hour
  if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
    clearInterval(pollInterval);
    console.error("Task timed out after 2 hour");
    return;
  }

  const { data } = await axios.get(`${API_URL}/api/agent/jobs/${jobId}/events`);

  if (data.events.length > 0) {
    const latestEvent = data.events[data.events.length - 1];

    // Display agent message
    console.log(latestEvent.message);

    // Handle terminal statuses
    if (latestEvent.status === 'completed') {
      clearInterval(pollInterval);
      // Extract and apply code
    } else if (latestEvent.status === 'requires_input') {
      clearInterval(pollInterval);
      // Agent asking for clarification - show input field, then use /resume
    } else if (latestEvent.status === 'error') {
      clearInterval(pollInterval);
      // Display error to user
    }
  }
}, 3000);
```


## Backend Query Endpoints
```python
@app.get("/api/agent/jobs/{job_id}/events")
async def get_job_events(job_id: str):
    events = await db.events.find({"job_id": job_id}).sort("timestamp", 1).to_list(100)
    return {"count": len(events), "events": events}

@app.get("/api/agent/jobs")
async def list_jobs():
    jobs = await db.jobs.find().sort("created_at", -1).limit(50).to_list(50)
    return {"jobs": jobs}
```


## Important Pointers

1. **Async Operation**: Agent processes jobs asynchronously. Responses arrive via webhook, not in the API response.

2. **Webhook Required**: Responses arrive at your webhook, not directly to client. Webhook URL must be publicly accessible (not localhost). Use `react_backend_url` present in the `.env` folder.

3. **Poll for Events**: Frontend should poll `GET /api/agent/jobs/{job_id}/events` every 30 seconds. Maximum polling duration: **2 hour**.

4. **Idempotency**: Use `x-delivery-id` header to prevent duplicate webhook processing.

5. **Resume vs Start**: Use `/resume` endpoint with `job_id` when status is `requires_input`. Use `/start` only for new conversations.

6. **Status Handling**: Agent returns one of three terminal statuses:
   - `completed` — Job finished successfully
   - `error` — Job failed
   - `requires_input` — Agent needs user clarification (use `/resume` to continue)

7. **Budget**: Specified in credits (default: 50). Exhaustion occurs only when the user's total the platform credit balance is depleted.

8. **Testing**: NEVER test agent API directly — always test via YOUR backend endpoints to avoid:
   - Consuming credits unnecessarily
   - Creating orphaned jobs
   - Bypassing application logic

9. **Error Handling**: Check for 2xx response before proceeding. If non-2xx, display error and don't start polling.

10. **MongoDB Storage**: Store both jobs and webhook events in MongoDB for tracking and retrieval.

11. **Base URL Construction**: Full endpoint format is `{base_url}/custom-agent/api/v1/agents/{agent_id}/start`

12. **Job/Task Duration**: Agent Jobs typically take 10–30 minutes. Set UI expectations accordingly.

13. **Map job_id**: Maintain a mapping of `job_id` from `/start` or `/resume` response to conversation for subsequent resume operations.

14. **Markdown Formatting**: Agent messages contain markdown formatting (`**bold**`, `*italic*`, etc.) - handle display formatting as needed.

15. **Display Message & Preview URL**: Always show both the message content and `preview_url` from webhooks in the UI.

16. **Message Storage**: Store all messages in conversation history. After user asks a question, display the latest message received from webhooks based on timestamp.


---

## Production Best Practices

### 1. Store job_id for Resume Operations

**Issue**: The `job_id` from `/start` response is needed for `/resume` calls.

**Solution**: Map and store `job_id` with conversation.

```python
# After calling /start or /resume
response = await client.post(url, json=payload)
job_id = response.json().get("job_id")

# Store in conversation
await db.conversations.update_one(
    {"conversation_id": conversation_id},
    {"$set": {"current_job_id": job_id, "updated_at": datetime.now(timezone.utc)}}
)
```

### 2. Markdown Formatting in Messages

**Note**: Agent messages contain markdown formatting (`**bold**`, `*italic*`, `code`, headings, etc.). You can choose to render the markdown in your UI or handle the formatting as appropriate for your application.
