# The platform Auth Integration Playbook

The platform provides hassle-free email authentication via Google OAuth.

## Important Variables

- **redirect_url**: Where user lands after auth. **CRITICAL:** Do not hardcode this. Derive it dynamically in the frontend using `window.location.origin` to prevent environment mismatches.
- **session_id**: Temporary token in URL fragment - use once then discard.
- **session_token**: Persistent auth token (7 days) - store in httpOnly cookie.

## Authentication Flow

**1. Login Button (Dynamic Redirect)**
Do not rely on any environment variable for the redirect URL.
Use the browser's location object to ensure the user returns to the exact domain they are currently on:

```javascript
const redirectUrl = window.location.origin + '/'; // or your main app route
window.location.href = `https://auth.yourplatform.com/?redirect=${encodeURIComponent(redirectUrl)}`;
```

**2. After Google Auth**
User automatically lands at `{redirect_url}#session_id={session_id}`

**3. Process Session ID**
Frontend detects `session_id` in URL fragment, shows loading state, then calls:
`https://demobackend.yourplatform.com/auth/v1/env/oauth/session-data`
with `X-Session-ID` header.
Response: `{"id": "string", "email": "string", "name": "string", "picture": "string", "session_token": "string"}`

**4. Backend Session Storage**
Store `session_token` in database with `timezone-aware` expiry (7 days).
Set httpOnly cookie with `path="/"`, `secure=True`, `samesite="none"`.

## Session Management & Security

**Check Existing Sessions**
Before showing login UI, check if `session_token` cookie exists. If authenticated, redirect to main app.

**Authentication Helper**
Backend should check `session_token` from cookies first, then Authorization header as fallback.
- **Warning:** Don't use FastAPI's `HTTPAuthorizationCredentials` dependency - it breaks cookie auth.

**User Data Storage**
Save user data to database. If user exists by email, don't create new user; update existing data if necessary.

**Logout**
Frontend calls logout endpoint; backend deletes session from database and clears cookie.

## Critical Rules

1. **Frontend Redirects:** Use `window.location.origin` to define the `redirect_url`. Never hardcode the domain or rely on frontend env vars for the OAuth redirect.
2. **CORS:** Ensure your backend allows requests from your frontend origin (allow credentials=True).
3. **Route Handling:** `redirect_url` must point to main app, not (landing page or login page).
4. **Race Conditions:** If `session_id` exists in URL, process it FIRST. Otherwise check existing `session_token`.
5. **Timezones:** Use timezone-aware datetimes (`datetime.now(timezone.utc)`).
6. **UX:** Show loading state while processing `session_id`.
7. **Cleanup:** Clean URL fragment after authentication.
8. **Dependencies:** Don't use FastAPI `HTTPAuthorizationCredentials` dependency.
9. **API Structure:** Ensure your custom backend session endpoint matches your API route structure. If your backend uses route prefixes (e.g., `/api`), make sure frontend calls include them (e.g., `/api/auth/session` not `/auth/session`).

## Test Identity Tracking
After setting up Google Auth, save relevant test identities to `/app/memory/test_credentials.md`:
- Allowed Google test accounts (email)
- Linked app users
- RBAC roles/permissions mapped to each test account
- Any domain/email allowlist used for access control

Do not store password-based credentials for Google Auth flows, since Google OAuth does not use app-managed passwords.
