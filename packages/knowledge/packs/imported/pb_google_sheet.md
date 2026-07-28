# Google Sheets Integration Playbook 📊

## Quick Setup Guide (copy exact)

### Step 1: Create a Google Cloud Project

1. Go to **Google Cloud Console**
   👉 [https://console.cloud.google.com](https://console.cloud.google.com)

2. Create a project (if needed):

   * Click **Select Project → New Project**
   * Name it: `your-app-name`
   * Click **Create**

---

### Step 2: Enable Google Sheets API

* Go to **APIs & Services → Library**
* Search for **Google Sheets API** → Click **Enable**

---

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External → Create**
3. Fill in the following:

   * App name: `your-app-name`
   * User support email: your email
   * Developer contact email: your email
4. Click **Save and Continue**
5. Under **Scopes → Add or Remove Scopes**:

   * Add: `https://www.googleapis.com/auth/spreadsheets` (for read/write)
   * Add: `https://www.googleapis.com/auth/spreadsheets.readonly` (for read only)
6. Under **Test users** → Add your Google email
7. Click **Save and Continue → Back to Dashboard**

---

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Choose **Web application**
4. Name it: `your-app-name`
5. Add:

   * **Authorized JavaScript origins:**
     `https://your-app-url.preview.yourplatform.com`
   * **Authorized redirect URIs:**
     `https://your-app-url.preview.yourplatform.com/api/oauth/sheets/callback`
6. Click **Create**
7. Save the  Google client id and Google secret id.

---

## 🧩 Install Dependencies

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

**IMPORTANT**
→ When validating Google OAuth scopes, do not enforce exact equality between the requested and returned scopes. Google may include additional scopes automatically when using the Sheets API. Always ensure that all requested scopes are granted, but ignore harmless extra scopes.


## Scopes

```python
[
    "https://www.googleapis.com/auth/spreadsheets",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]
```
---

## Code

```python
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from datetime import datetime, timezone
from fastapi.responses import RedirectResponse
import warnings

# 1. START OAUTH
@app.get("/oauth/sheets/login")
async def sheets_login(user_id: str):
    flow = Flow.from_client_config({
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }, scopes=SCOPES, redirect_uri=REDIRECT_URI)

    url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'  # Must have for refresh token
    )

    await save_state(state, user_id, ttl=600)
    return RedirectResponse(url)

# 2. HANDLE CALLBACK
@app.get("/oauth/sheets/callback")
async def sheets_callback(code: str, state: str):
    user_id = await verify_state(state)
    flow = Flow.from_client_config({...}, scopes=SCOPES, redirect_uri=REDIRECT_URI)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        flow.fetch_token(code=code)

    creds = flow.credentials

    required_scopes = {"https://www.googleapis.com/auth/spreadsheets"} #replace with required scopes
        granted_scopes = set(creds.scopes or [])
        if not required_scopes.issubset(granted_scopes):
            missing = required_scopes - granted_scopes
            logger.error(f"Missing required sheets scopes: {missing}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing required sheets scopes: {', '.join(missing)}"
            )
    await save_tokens(user_id, creds)
    return RedirectResponse("/dashboard")

# 3. GET CREDS (auto-refresh)
async def get_sheets_creds(user_id: str):
    token = await db.get_token(user_id)
    creds = Credentials(
        token=token["access_token"],
        refresh_token=token["refresh_token"],
        token_uri=token["token_uri"],
        client_id=token["client_id"],
        client_secret=token["client_secret"]
    )

    expires = token["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) >= expires:
        creds.refresh(GoogleRequest())
        await db.update_token(user_id, creds.token)

    return creds

# 4. USE IT
@app.get("/sheets/read")
async def read_sheet(user_id: str, spreadsheet_id: str, range_: str):
    creds = await get_sheets_creds(user_id)
    service = build('sheets', 'v4', credentials=creds)
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=range_
    ).execute()
    return result.get('values', [])

@app.post("/sheets/write")
async def write_sheet(user_id: str, spreadsheet_id: str, range_: str, values: list):
    creds = await get_sheets_creds(user_id)
    service = build('sheets', 'v4', credentials=creds)
    body = {"values": values}
    result = service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_,
        valueInputOption="RAW",
        body=body
    ).execute()
    return result
```

---

## Database

```python
{
    "user_id": "uuid",
    "access_token": "...",
    "refresh_token": "...",  # May be None!
    "expires_at": "datetime with timezone",
    "client_id": "...",
    "client_secret": "...",
    "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## THINGS THAT COULD CAUSE ERROR

→ Always include `access_type='offline'` + `prompt='consent'`
→ Auto-refresh logic must check timezone-aware `expires_at`
→ Writes are batched per 100 updates; throttle heavy writes
→ Must use full `"https://www.googleapis.com/auth/spreadsheets"` if writing
→ Your deployed callback URL **must** match Google Console exactly
→ Always ensure timezone-aware datetime handling before comparing or storing datetimes in MongoDB.

---

## Common Operations
→ Use values.get, values.update, and values.append methods from the Sheets API to read, write, and append data.

---

## Important

* Implement logout + full token revocation
* Each user/session must have isolated credentials
* Always encrypt refresh tokens in DB
* Use `asyncio.to_thread` for heavy sheet reads/writes
* For public Sheets, set sharing = “Anyone with link → Viewer/Editor”
