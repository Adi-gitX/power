# Google Drive Integration Playbook 📁

## Quick Setup Guide (Copy exact)

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   * Visit: [https://console.cloud.google.com](https://console.cloud.google.com)
   * Sign in with your Google account

2. **Create a Project (if needed)**
   * Click on the project dropdown at the top → "New Project"
   * Name it: `drive-hub` or `your-app-name`
   * Click **Create**

3. **Enable Google Drive API**
   * Go to **APIs & Services → Library**
   * Search for **Google Drive API** → Click **Enable**

4. **Configure OAuth Consent Screen**
   * Go to **APIs & Services → OAuth consent screen**
   * Choose **External** → Click **Create**
   * Fill in:
     * App name: `DriveHub` or your app name
     * User support email: your email
     * Developer contact email: your email
   * Click **Save and Continue**
   * Under **Scopes** → Click **Add or Remove Scopes**:
     * Add: `https://www.googleapis.com/auth/drive` (full access)
     * OR: `https://www.googleapis.com/auth/drive.readonly` (read-only)
     * OR: `https://www.googleapis.com/auth/drive.file` (only files created by app)
   * Click **Update → Save and Continue**
   * Under **Test users** → Click **Add Users** → add your Google email
   * Click **Save and Continue → Back to Dashboard**

5. **Create OAuth Credentials**
   * Go to **APIs & Services → Credentials**
   * Click **Create Credentials → OAuth client ID**
   * Application type: **Web application**
   * Name: `DriveHub` or your app name
   * **Authorized JavaScript origins:**
     * `https://your-app-url.preview.yourplatform.com`
   * **Authorized redirect URIs:**
     * `https://your-app-url.preview.yourplatform.com/api/oauth/drive/callback`
   * Click **Create**
   * Copy your **Client ID** and **Client Secret** — you'll need these in `.env`
   * Save `Client ID` + `Client Secret`

---

## Install Dependencies

```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

Add to `requirements.txt`:
```
google-api-python-client==2.185.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.2
```

---

**IMPORTANT**
→ When validating Google OAuth scopes, do not enforce exact equality between the requested and returned scopes. Google may include additional scopes automatically when using the Drive API. Always ensure that all requested scopes are granted, but ignore harmless extra scopes.


## Scopes (choose based on your needs)

### Full Access (Read + Write + Delete)
```python
SCOPES = ['https://www.googleapis.com/auth/drive']
```

### Read-Only Access
```python
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
```

### App-Specific Files Only
```python
SCOPES = ['https://www.googleapis.com/auth/drive.file']
```

**Note:** Google may automatically add these scopes:
- `openid`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

---

## Environment Variables (.env)

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_DRIVE_REDIRECT_URI="https://your-app.preview.yourplatform.com/api/oauth/drive/callback"
FRONTEND_URL="https://your-app.preview.yourplatform.com"
```

---

## Complete Backend Code

```python
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Header
from fastapi.responses import StreamingResponse
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from datetime import datetime, timezone
import os, io, tempfile, logging

logger = logging.getLogger(__name__)

api_router = APIRouter(prefix="/api")

# Database helper (implement based on your DB)
async def get_current_user(authorization: str = Header(None)):
    # Your auth logic here
    pass

# 1. START DRIVE OAUTH
@api_router.get("/drive/connect")
async def connect_drive(user = Depends(get_current_user)):
    """Initiate Google Drive OAuth flow"""
    try:
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=['https://www.googleapis.com/auth/drive'],
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',  # Force consent to get refresh token
            state=user.id  # Pass user ID as state
        )
        
        logger.info(f"Drive OAuth initiated for user {user.id}")
        return {"authorization_url": authorization_url}
    
    except Exception as e:
        logger.error(f"Failed to initiate OAuth: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate OAuth: {str(e)}")

# 2. HANDLE CALLBACK
@api_router.get("/drive/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...)):
    """Handle Google Drive OAuth callback"""
    try:
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")
        
        # Don't specify scopes in callback - accept whatever Google granted
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=None,  # Accept all granted scopes
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        logger.info(f"Drive credentials obtained for user {state}, scopes: {credentials.scopes}")

        required_scopes = {"https://www.googleapis.com/auth/drive"} #replace with required scopes
        granted_scopes = set(credentials.scopes or [])
        if not required_scopes.issubset(granted_scopes):
            missing = required_scopes - granted_scopes
            logger.error(f"Missing required Drive scopes: {missing}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing required Drive scopes: {', '.join(missing)}"
            )
        
        # Store credentials in database
        await db.drive_credentials.update_one(
            {"user_id": state},
            {"$set": {
                "user_id": state,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes,
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info(f"Drive credentials stored for user {state}")
        
        # Redirect to frontend
        frontend_url = os.getenv("FRONTEND_URL")
        return {"redirect": f"{frontend_url}/dashboard?drive_connected=true"}
    
    except Exception as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

# 3. GET DRIVE SERVICE (auto-refresh)
async def get_drive_service(user = Depends(get_current_user)):
    """Get Google Drive service with auto-refresh credentials"""
    creds_doc = await db.drive_credentials.find_one({"user_id": user.id})
    if not creds_doc:
        raise HTTPException(
            status_code=400, 
            detail="Google Drive not connected. Please connect your Drive first."
        )
    
    # Create credentials object
    creds = Credentials(
        token=creds_doc["access_token"],
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc["token_uri"],
        client_id=creds_doc["client_id"],
        client_secret=creds_doc["client_secret"],
        scopes=creds_doc["scopes"]
    )
    
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        logger.info(f"Refreshing expired token for user {user.id}")
        creds.refresh(GoogleRequest())
        
        # Update in database
        await db.drive_credentials.update_one(
            {"user_id": user.id},
            {"$set": {
                "access_token": creds.token,
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return build('drive', 'v3', credentials=creds)

```

---

## Database Schema (MongoDB)

```javascript
// Collection: drive_credentials
{
    "user_id": "uuid-or-user-id",
    "access_token": "ya29.a0...",
    "refresh_token": "1//0gXXX...",  // May be None if not granted!
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_id": "xxx.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxx",
    "scopes": [
        "https://www.googleapis.com/auth/drive",
        "openid",
        "https://www.googleapis.com/auth/userinfo.email"
    ],
    "expiry": "2025-10-30T14:00:00+00:00",  // ISO format with timezone
    "updated_at": "2025-10-30T13:00:00+00:00"
}
```

---

## THINGS THAT COULD CAUSE ERRORS

→ Always include `access_type='offline'` + `prompt='consent'`
→ Auto-refresh logic must check timezone-aware `expires_at`
→ Drive API rate limits → 10 QPS/user + retry on 403/429.
→ Your deployed callback URL **must** match Google Console exactly
→ Always ensure timezone-aware datetime handling before comparing or storing datetimes in MongoDB.

---

## Security Best Practices

   - Always encrypt access_token and refresh_token; never log or expose them.
   - Revoke the user’s token via Google’s revoke endpoint and delete their credentials from the database.
   - Check file size, allowed MIME types, and scan for malware before saving.
   - Prefer drive.file (app-only) or drive.readonly; use full drive scope only if necessary.
