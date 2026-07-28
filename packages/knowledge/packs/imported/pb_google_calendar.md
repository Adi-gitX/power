# Google Calendar Integration Playbook 

##  MANDATORY: ASK USER FOR CREDENTIALS FIRST 

CRITICAL DISTINCTION:
- The platform Auth = USER SIGN-IN ONLY (no API keys needed, cannot access Calendar API)
- Google Calendar API = SEPARATE OAuth credentials required (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)

These are TWO DIFFERENT integrations. Do NOT confuse them.

---

## BEFORE ANY IMPLEMENTATION - ASK USER:

"Do you have Google Calendar API credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) from Google Cloud Console?"

- YES: Request credentials → Add to .env → Proceed
- NO: Share the "Quick Setup Guide" below → Wait for credentials → Then proceed

App will NOT work without these credentials. This step is MANDATORY, not optional.

---

## Quick Setup Guide (Copy to User if They Don't Have Credentials)

### Step 1: Create a Google Cloud Project

1. Go to Google Cloud Console
    [https://console.cloud.google.com](https://console.cloud.google.com)

2. Create a project (if needed):

   * Click Select Project → New Project
   * Name it: `your-app-name`
   * Click Create

---

### Step 2: Enable Google calendar API

* Go to APIs & Services → Library
* Search for Google calendar API → Click Enable

---

### Step 3: Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Choose External → Create
3. Fill in the following:

   * App name: `your-app-name`
   * User support email: your email
   * Developer contact email: your email
4. Click Save and Continue
5. Under Scopes → Add or Remove Scopes:

   * Add: `https://www.googleapis.com/auth/calendar` (for read/write)
   * Add: `https://www.googleapis.com/auth/calendar.readonly` (for read only)
6. Under Test users → Add your Google email
7. Click Save and Continue → Back to Dashboard

---

### Step 4: Create OAuth Credentials

1. Go to APIs & Services → Credentials
2. Click Create Credentials → OAuth client ID
3. Choose Web application
4. Name it: `your-app-name`
5. Add:

   * Authorized JavaScript origins:
     `REACT_APP_BACKEND_URL`
   * Authorized redirect URIs:
     `REACT_APP_BACKEND_URL/api/oauth/calendar/callback`
6. Click Create
7. Save the  Google client id and Google secret id.

---

---

## Implementation (Only After Getting Credentials)

## Install
```bash
pip install google-auth google-auth-oauthlib google-api-python-client
```

## Scopes
```python
["https://www.googleapis.com/auth/calendar"]
```

## Code

```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import requests

# 1. START OAUTH
@app.get("/auth/google/login")
async def login():
    flow = Flow.from_client_config({
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }, scopes=[...], redirect_uri=REDIRECT_URI)
    
    url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )
    return {"authorization_url": url}

# 2. HANDLE CALLBACK
@app.get("/auth/google/callback")
async def callback(code: str):
    # Direct token exchange - avoids scope mismatch
    token_resp = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code'
    }).json()
    
    # Get email
    user = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {token_resp["access_token"]}'}
    ).json()
    
    # Save tokens
    await db.users.update_one(
        {"email": user['email']},
        {"$set": {"google_tokens": token_resp}},
        upsert=True
    )
    return RedirectResponse(f"/dashboard?email={user['email']}")

# 3. AUTO-REFRESH
async def get_creds(email: str):
    tokens = (await db.users.find_one({"email": email}))['google_tokens']
    creds = Credentials(
        token=tokens['access_token'],
        refresh_token=tokens.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET
    )
    
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        await db.users.update_one(
            {"email": email},
            {"$set": {"google_tokens.access_token": creds.token}}
        )
    return creds

# 4. USE IT
@app.get("/calendar/events")
async def get_events(email: str):
    service = build('calendar', 'v3', credentials=await get_creds(email))
    return service.events().list(
        calendarId='primary',
        timeMin=datetime.now(timezone.utc).isoformat(),
        maxResults=50
    ).execute()

@app.post("/calendar/events")
async def create_event(email: str, data: dict):
    service = build('calendar', 'v3', credentials=await get_creds(email))
    return service.events().insert(
        calendarId='primary',
        body={
            'summary': data['title'],
            'start': {'dateTime': data['start'], 'timeZone': 'UTC'},
            'end': {'dateTime': data['end'], 'timeZone': 'UTC'}
        }
    ).execute()
```

## Operations

**Delete:** `service.events().delete(calendarId='primary', eventId=id).execute()`

**Update:** `service.events().update(calendarId='primary', eventId=id, body=event).execute()`

**All-day:** Use `'date': '2025-01-15'` instead of `dateTime`

## Gotchas

**1. Scope mismatch**
→ Use `requests.post()` for token exchange, not `flow.fetch_token()`

**2. No refresh_token**
→ Must use `access_type='offline'` + `prompt='consent'`

**3. DateTime format**
→ ISO 8601: `2025-01-15T10:00:00Z`

**4. Don't use People API**
→ Use `oauth2/v2/userinfo` for email

## Errors
- `401` → Re-auth
- `403` → API not enabled or missing scope
- `404` → Event doesn't exist

## Important
- Implement logout functionality with complete session termination
- Ensure session isolation: each browser/device session must be independent with no cross-session data visibility
- Always validate redirect URIs match your production domains (not localhost)
