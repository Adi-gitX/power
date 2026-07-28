# RESEND_EMAIL_PLAYBOOK

Send transactional emails through the platform's managed email integration. You do
NOT need a Resend account or API key — the platform owns the provider account
and routes your sends through the integration proxy. This playbook covers async,
non-blocking FastAPI usage.

## How it works
- You send email by POSTing to the integration proxy, authenticated with a
  per-app email key the platform provisions for you.
- The sender **address** (`From` email) is fixed and managed by the platform — you
  cannot set it. You **must** set the sender **display name** via `from_name`
  (the business/brand name). You may set a reply-to via `contact_email`.
- The platform's sending domain is already verified, so email is delivered to
  any recipient (no "verified addresses only" testing limitation).

<setup>
## Environment Setup
Add to `/app/backend/.env`:
PLATFORM_EMAIL_KEY={platform_email_key}
EMAIL_FROM_NAME=Your Business Name
`EMAIL_FROM_NAME` is **required** — set it to the business/brand name the user
gave you (the same name you show in the app/emails). Do NOT add a `RESEND_API_KEY`
or `SENDER_EMAIL` — they are not used. The proxy base URL is a constant in the
code (see `EMAIL_BASE_URL` below); do NOT read it from the environment.

Add to `/app/backend/requirements.txt`:
httpx>=0.27.0

## Required Imports
```python
import os
import logging
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

# The platform managed email proxy. This is a CONSTANT — never read it from
# os.environ, so it survives deployment.
EMAIL_BASE_URL = "https://integrations.yourplatform.com"
EMAIL_KEY = os.environ["PLATFORM_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]   # REQUIRED — business/brand sender display name
```

## Pydantic Model
```python
class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str
    reply_to: EmailStr | None = None  # optional; becomes the Reply-To header
```

## Send Email (Async + Non-blocking)
```python
@router.post("/send-email")
async def send_email(request: EmailRequest):
    payload = {
        "to": [request.recipient_email],
        "subject": request.subject,
        "html": request.html_content,
        "from_name": EMAIL_FROM_NAME,   # REQUIRED on every send — the business/brand sender name
    }
    if request.reply_to:
        payload["contact_email"] = request.reply_to

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return {
            "status": "success",
            "message": f"Email sent to {request.recipient_email}",
            "email_id": resp.json().get("id"),
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")
```
</setup>

<important_pointers>
Important pointers:
1. Base URL is a constant: `EMAIL_BASE_URL` is hardcoded in the backend (NOT an
   env var). This is deliberate — a hardcoded constant survives deployment,
   whereas a platform-injected env var would be missing in the deployed app.
2. Authentication: send the per-app key in the `X-Email-Key` header. Never log
   it or expose it to the frontend — it stays server-side in the backend.
3. **Sender display name is REQUIRED** — pass `from_name` on **every** send,
   sourced from the `EMAIL_FROM_NAME` env var. NEVER hardcode it (e.g. "My App")
   and never omit it. It sets the visible sender (display) name only; the `From`
   email address itself is managed by the platform and cannot be set.
4. Reply handling: to let recipients reply to a real inbox, pass `contact_email`
   (it maps to Reply-To). Do not put sensitive data (OTPs, tokens) in
   `contact_email`; it is never cc'd.
5. Endpoint + method: always `POST {EMAIL_BASE_URL}/api/v1/email/send`.
6. Request body: `to` (list), `subject`, `html`, `from_name` (required), optional
   `contact_email`. A successful send returns `202` with `{"id": "..."}`.
7. HTML Email Rules:
   - Use inline CSS only (no external stylesheets).
   - Use tables for layout (email clients have limited CSS support).
   - Avoid external fonts and images that may hurt deliverability.
8. Non-blocking: use `httpx.AsyncClient` (shown above) so the FastAPI event loop
   stays non-blocking. If you must use the sync `requests` library instead, wrap
   the call in `await asyncio.to_thread(...)`.
9. MongoDB ID Handling (when fetching content for emails):
   - MongoDB stores `_id` (ObjectId) internally — ignore it.
   - Create your own ID field (e.g. `user_id`, `note_id`) as a regular string.
   - Query with `{"_id": 0}` projection to exclude `_id` from results.
10. Environment Variables: always `load_dotenv()` before reading `os.environ`.
11. PLATFORM_EMAIL_KEY: the platform provisions this and writes it into `.env`.
    Never mint, rotate, or expose it to the frontend.
12. Restart Backend: after adding env vars, restart with
    `sudo supervisorctl restart backend`.

Self-verification (run before finishing)

Grep your backend — each MUST appear at least once:
- EMAIL_FROM_NAME — set in /app/backend/.env AND read in the backend code.
- from_name — present in the /api/v1/email/send payload.

If from_name is missing from the send payload, the integration is NOT complete.
</important_pointers>