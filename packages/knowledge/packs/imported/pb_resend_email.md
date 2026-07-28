# RESEND_EMAIL_PLAYBOOK

Send transactional emails using Resend API. This playbook covers async FastAPI integration with non-blocking email sending.

## Prerequisites
- Resend Account: Sign up at https://resend.com
- API Key: Dashboard → API Keys → Create API Key (starts with `re_...`)
- Note: In testing mode, emails only go to verified email addresses

<setup>

## Environment Setup

Add to `/app/backend/.env`:
```
RESEND_API_KEY=re_your_api_key_here
SENDER_EMAIL=onboarding@resend.dev
```

Add to `/app/backend/requirements.txt`:
```
resend>=2.0.0
```

## Required Imports

```python

import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
```

## Pydantic Model

```python
class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str
```

## Send Email (Async + Non-blocking)

```python
@router.post("/send-email")
async def send_email(request: EmailRequest):
    params = {
        "from": SENDER_EMAIL,
        "to": [request.recipient_email],
        "subject": request.subject,
        "html": request.html_content
    }

    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "message": f"Email sent to {request.recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
```

</setup>

<important_pointers>

Important pointers:

1. Non-blocking calls: Always use `asyncio.to_thread(resend.Emails.send, params)` since Resend SDK is synchronous. This keeps FastAPI event loop non-blocking.

2. HTML Email Rules: 
   - Use inline CSS only (no external stylesheets)
   - Use tables for layout (email clients have limited CSS support)
   - Avoid external fonts and images that may break deliverability

3. Environment Variables: Always load with `load_dotenv()` before accessing `os.environ.get()`.

4. MongoDB ID Handling (when fetching content for emails):
   - MongoDB stores `_id` (ObjectId) internally - ignore it
   - Create your own ID field (e.g., `user_id`, `note_id`) as a regular string
   - Always query with `{"_id": 0}` projection to exclude `_id` from results
   - Pydantic model uses custom ID field as normal `str` - no aliases needed

5. Restart Backend: After adding environment variables, restart the backend with `sudo supervisorctl restart backend`.

</important_pointers>