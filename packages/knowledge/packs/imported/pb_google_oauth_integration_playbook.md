VERIFIED PLAYBOOK
Required API Keys:
Google OAuth Client ID and Client Secret (from Google Cloud Console)

Share the following URLs with the user to add in Google Cloud Console:

Authorized JavaScript Origins (add ALL that apply):
- {preview_url}
- {deployed_url}
- Custom domain (if user has attached one)

Authorized redirect URIs (add ALL that apply):
- {preview_url}/auth/google
- {deployed_url}/auth/google
- Custom domain /auth/google (if user has attached one)

IMPORTANT: Ask the user if they have a custom domain attached. If yes, they MUST add that domain to both Authorized JavaScript Origins and Authorized redirect URIs in Google Cloud Console, otherwise OAuth will fail on the custom domain.

<EXAMPLE>
```
Authorized JavaScript Origins:
- https://{{app_name}}.preview.yourplatform.com
- https://{{app_name}}.platform.cloud
- https://custom-domain.com

Authorized redirect URIs:
- https://{{app_name}}.preview.yourplatform.com/auth/google
- https://{{app_name}}.platform.cloud/auth/google
- https://custom-domain.com/auth/google
```
</EXAMPLE>

Backend: FastAPI
Google Cloud Console Setup:
    Enable Google Sign-In API and generate OAuth2 credentials.
    Add ALL URLs to the OAuth consent screen: preview URL, deployed URL, and any custom domains.

Install Dependencies:
pip install fastapi uvicorn authlib python-dotenv
FastAPI OAuth Setup:
```
from fastapi import FastAPI, Request
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI()
oauth = OAuth()
oauth.register(name="google", client_id="your_client_id", client_secret="your_client_secret")

@app.get("/login/google")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, redirect_uri=request.url_for("auth"))

@app.get("/auth/google")
async def auth(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = await oauth.google.parse_id_token(request, token)
    return {{"user": user_info}}
```
Frontend: React
Install React OAuth:
npm install @react-oauth/google
Provider Setup:
```
import {{ GoogleOAuthProvider }} from '@react-oauth/google';
function App() {{
  return <GoogleOAuthProvider clientId="your_client_id">Your App</GoogleOAuthProvider>;
}}
```

Login Button:
```
import {{ GoogleLogin }} from '@react-oauth/google';

const LoginButton = () => (
  <GoogleLogin
    onSuccess={{async (response) => {{
      const userData = await fetch('/backend/auth/google', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ code: response.code }}),
      }}).then(res => res.json());
      localStorage.setItem('user', JSON.stringify(userData));
    }}
  />
);
```
Common Issues
1. Redirect URI Mismatch: Ensure ALL URIs (preview, deployed, and custom domain) are added to Google Console.
2. Missing Custom Domain: If user has a custom domain, it MUST be added to Google Console or OAuth will fail.
3. CSRF Protection: Use Authlib's built-in state management.
4. Token Storage: Use secure cookies.

Auth Redirect URL:
For the OAuth redirect URL, always use `window.location.origin` to build the redirect - never hardcode or use environment variables:

<codeExample javascript>
// WRONG - Don't hardcode or use env vars for auth redirect
const redirectUrl = 'http://localhost:3000/auth/google';
const redirectUrl = process.env.REACT_APP_BACKEND_URL + '/auth/google';

// CORRECT - Use window.location.origin for auth redirect
const redirectUrl = window.location.origin + '/auth/google';
</codeExample>

IMPORTANT: ALWAYS ADD A COMMENT IN THE CODE WHEN INTEGRATING AND IMPLEMENTING GOOGLE OAUTH, STATING:
"REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH"
Adding this line in code is beneficial in longer runs, as this code is often passed to another agent that does not have this context, so be mindful and always include the above line.

## Test Identity Tracking
After setting up Google Auth, save relevant test identities to `/app/memory/test_credentials.md`:
- Allowed Google test accounts (email)
- Linked app users
- RBAC roles/permissions mapped to each test account
- Any domain/email allowlist used for access control

Do not store password-based credentials for Google Auth flows, since Google OAuth does not use app-managed passwords.

