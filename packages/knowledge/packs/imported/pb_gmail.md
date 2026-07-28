# GMail Integration Playbook 

##  MANDATORY: ASK USER FOR CREDENTIALS FIRST 

CRITICAL DISTINCTION:
- The platform Auth = USER SIGN-IN ONLY (no API keys needed, cannot access mail API)
- Gmail integration = SEPARATE OAuth credentials required (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)

These are TWO DIFFERENT integrations. Do NOT confuse them.

---

## BEFORE ANY IMPLEMENTATION - ASK USER:

"Do you have Google Mail API credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) from Google Cloud Console?"

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

### Step 2: Enable Google Mail API

* Go to APIs & Services → Library
* Search for Google Mail API → Click Enable

---

### Step 3: Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Choose External → Create
3. Fill in the following:

   * App name: `your-app-name`
   * User support email: your email
   * Developer contact email: your email
4. Click Save and Continue
5. Under Scopes → Add or Remove Scopes
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
     `REACT_APP_BACKEND_URL/api/oauth/gmail/callback`
6. Click Create
7. Save the  Google client id and Google secret id.

---

## Implementation (Only After Getting Credentials)

## Install
```bash
pip install google-auth google-auth-oauthlib google-api-python-client
```

## Scopes (copy exact)
```python
[
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify", 
    "https://www.googleapis.com/auth/gmail.labels",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"  # YES include this
]
```

## Code

```python
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import warnings

# 1. START OAUTH
@app.get("/oauth/google/login")
async def login(user_id: str):
    flow = Flow.from_client_config({
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }, scopes=[...], redirect_uri=REDIRECT_URI)
    
    url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'  # Must have for refresh token
    )
    
    await save_state(state, user_id, ttl=600)
    return RedirectResponse(url)

# 2. HANDLE CALLBACK
@app.get("/oauth/google/callback")  
async def callback(code: str, state: str):
    user_id = await verify_state(state)
    
    flow = Flow.from_client_config({...}, scopes=[...], redirect_uri=REDIRECT_URI)
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # Ignore scope order warnings
        flow.fetch_token(code=code)
    
    creds = flow.credentials
    await save_tokens(user_id, creds)  # Save to DB
    return RedirectResponse("/dashboard")

# 3. GET CREDS (auto-refresh)
async def get_creds(user_id: str):
    token = await db.get_token(user_id)
    creds = Credentials(
        token=token["access_token"],
        refresh_token=token["refresh_token"],
        token_uri=token["token_uri"],
        client_id=token["client_id"],
        client_secret=token["client_secret"]
    )
    
    # Handle timezone properly
    expires = token["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) >= expires:
        creds.refresh(GoogleRequest())
        await db.update_token(user_id, creds.token)
    
    return creds

# 4. USE IT
@app.get("/emails")
async def get_emails(user_id: str):
    creds = await get_creds(user_id)
    service = build('gmail', 'v1', credentials=creds)
    
    result = service.users().messages().list(
        userId='me', 
        maxResults=50
    ).execute()
    
    return result.get('messages', [])
```

## Database
```python
{
    "user_id": "uuid",
    "access_token": "...",
    "refresh_token": "...",  # CRITICAL: Can be None!
    "expires_at": "datetime with timezone",
    "client_id": "...",
    "client_secret": "...",
    "token_uri": "..."
}
```

## Gotchas That Will Break Your Shit

**1. Missing refresh_token**
→ ALWAYS use `access_type='offline'` + `prompt='consent'`

**2. Timezone hell**
→ MongoDB = naive datetime, Python = aware. Convert before comparing!

**3. Scope order mismatch**  
→ Suppress warnings or it crashes. Google reorders scopes randomly.

**4. State expires**
→ 10 min TTL max. Clean up after use.

## Common Operations

**Create label:**
```python
service.users().labels().create(userId='me', body={"name": "Work"}).execute()
```

**Apply label:**
```python
service.users().messages().modify(userId='me', id=msg_id, body={'addLabelIds': [label_id]}).execute()
```

**Search:**
```python
service.users().messages().list(userId='me', q='from:boss@work.com').execute()
```

## Error Codes
- `401` → Token dead, re-auth user
- `403` → Missing scope
- `429` → Rate limit, sleep(1) and retry

## Important
- Implement logout functionality with complete session termination
- Ensure session isolation: each browser/device session must be independent with no cross-session data visibility
