Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments for your specific use case.**

# Twitter OAuth 1.0a Integration Playbook

**FastAPI Backend + React Frontend (2024-2025)**

---

## 1. Installation & Configuration

```bash
# Backend dependencies
pip install fastapi authlib python-dotenv uvicorn sqlalchemy

```

**Twitter Developer Setup**:

1. Create app at [developer.twitter.com](https://developer.twitter.com/)
2. Enable OAuth 1.0a with callback: `https://yourdomain.com/auth/twitter/callback`
3. Store:

```
# .env
TWITTER_CLIENT_ID=your_consumer_key
TWITTER_CLIENT_SECRET=your_consumer_secret

```

---

## 2. FastAPI Backend Implementation

### OAuth Configuration (`oauth.py`)

```python
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

config = Config('.env')
oauth = OAuth(config)

oauth.register(
    name='twitter',
    request_token_url='<https://api.twitter.com/oauth/request_token>',
    access_token_url='<https://api.twitter.com/oauth/access_token>',
    authorize_url='<https://api.twitter.com/oauth/authenticate>',
    api_base_url='<https://api.twitter.com/1.1/>',
)

```

### Routes (`main.py`)

```python
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from .oauth import oauth

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.get("/login/twitter")
async def login_via_twitter(request: Request):
    redirect_uri = request.url_for('auth_callback')
    return await oauth.twitter.authorize_redirect(request, redirect_uri)

@app.get("/auth/twitter/callback")
async def auth_callback(request: Request):
    token = await oauth.twitter.authorize_access_token(request)
    user_data = await oauth.twitter.get(
        'account/verify_credentials.json',
        token=token,
        params={'include_email': 'true'}
    )
    # Store token+secret in DB with user_data.json()['id']
    return {"user": user_data.json(), "tokens": token}

```

---

## 3. React Frontend

### Auth Service (`auth.js`)

```jsx
export const twitterLogin = () => {
  window.location.href = '<http://localhost:8000/login/twitter>';
};

export const handleCallback = async (oauth_token, oauth_verifier) => {
  const response = await axios.post('/auth/twitter/callback', {
    oauth_token,
    oauth_verifier
  });
  localStorage.setItem('user', JSON.stringify(response.data.user));
};

```

### Callback Handler (`CallbackPage.jsx`)

```jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { handleCallback } from './auth';

export default function CallbackPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    handleCallback(
      params.get('oauth_token'),
      params.get('oauth_verifier')
    ).then(() => navigate('/dashboard'));
  }, []);

  return <div>Authenticating...</div>;
}

```

---

## 4. Multiple Account Authorization

**Backend Modifications**:

```python
# Add to auth_callback route
from your_db_module import check_existing_user

if await check_existing_user(user_data['id']):
    return {"error": "Account already linked. Switch accounts?", "status": 409}

```

**Frontend Handling**:

```jsx
// Handle 409 error
if (error.response?.status === 409) {
  showAccountSwitchModal(error.response.data.error);
}

```

---

## 5. Security Best Practices

1. Use HTTPS in production
2. Implement token rotation with `oauth/request_token`
3. Store `oauth_token_secret` encrypted in DB
4. Add CSRF protection for state validation

---

## 6. Testing

```bash
# 1. Start backend
uvicorn main:app --reload

# 2. Test authorization flow
curl -v <http://localhost:8000/login/twitter>

# 3. Verify token storage
SELECT * FROM users WHERE twitter_id = '<user_id>';

```

**Postman Collection**:

- [Twitter OAuth 1.0a Collection Template](https://www.postman.com/twitter/workspace/twitter-s-public-workspace/collection/9954914-a6964d51-7b0a-4a9e-8e9c-6d3b8e7d1b9c)

---

**Troubleshooting**:

- `401 Unauthorized`: Verify Twitter app permissions
- `403 Forbidden`: Check callback URL whitelisting
- `Invalid OAuth Request`: Validate HMAC-SHA1 signature implementation
- `MongoDB ObjectId Serialization Error`: When using MongoDB with FastAPI, always exclude the _id field from queries by adding {""_id"": 0} to prevent ObjectId serialization errors in JSON responses - for example - # Add {""_id"": 0} to exclude ObjectId fields from all MongoDB queries
user = await db.users.find_one({""email"": email}, {""_id"": 0})
users = await db.users.find({""status"": ""active""}, {""_id"": 0}).to_list(None)

**Required API Keys:**

- Twitter Consumer Key (API Key)
- Twitter Consumer Secret (API Secret Key)
- Obtain from: https://developer.twitter.com/en/portal/dashboard

**Important Notes:**

- This playbook requires a Twitter Developer account and approved app
- OAuth 1.0a requires proper signature generation for secure authentication
- Multiple account support requires careful database design to link users with Twitter accounts
- Test thoroughly in development before production deployment
- All datetime objects must be in isoformat

