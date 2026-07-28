# The platform Auth Integration Playbook — Cross-Platform (Web + Mobile)

The platform provides hassle-free email authentication via Google OAuth. This playbook covers a **cross-platform app on the mono base image**: a shared FastAPI + MongoDB backend (`/app/backend`) serving **both** a web React frontend (`/app/frontend`) and an Expo / React Native app (`/app/mobile`). The backend is shared and supports both auth transports — **httpOnly cookies for web** and **Bearer tokens for mobile** — so implement the backend ONCE and wire each frontend to it.

There's a testing playbook at the end of this file. Ask the agent to save that playbook to /app/auth_testing.md before moving ahead.

Implement only the frontend section(s) for the surface(s) in scope. If the app has both surfaces, implement both against the single shared backend.

## Important Variables

- redirect_url: Where the user lands after auth — your main app (dashboard/app), NOT a landing/login page. CRITICAL: Do not hardcode; derive dynamically. **Platform-specific:** on web use `window.location.origin + '/dashboard'` (or your main route); on native mobile use `Linking.createURL('auth')` (resolves for Expo Go `exp://...` and production `myapp://auth`); on the Expo web preview (`Platform.OS === 'web'`) use `window.location.origin + '/'` and point to an existing route.
- session_id: Temporary token in the redirect URL fragment/query — use once then discard.
- session_token: Persistent auth token (7 days). **Storage is platform-specific:** web → httpOnly cookie; mobile → `expo-secure-store`; Expo web preview → `localStorage`. Never use AsyncStorage (unencrypted).

## Dependencies

- Backend: `fastapi`, `uvicorn`, `motor`, `httpx>=0.24.0`, `python-dotenv`
- Mobile frontend: `expo-web-browser`, `expo-linking`, `expo-secure-store`
- Web frontend: no extra auth dependency (uses fetch + cookies)

---

## Shared Backend Implementation (one backend for both frontends)

The call to the platform Auth's `/session-data` endpoint MUST be made from the backend, never the frontend.

GET `https://demobackend.yourplatform.com/auth/v1/env/oauth/session-data`
Header: `X-Session-ID: <session_id>`
Response:
```json
{"id": "string", "email": "string", "name": "string", "picture": "string", "session_token": "string"}
```

**Session storage.** Verify the `session_token` with the platform's session-data API using `httpx`, upsert the user by email (don't create duplicates), and store the session in the `user_sessions` collection with `session_token`, `user_id`, timezone-aware `expires_at` (7 days), and `created_at`.

**CRITICAL — User ID Pattern (Avoids _id Issues).** Generate your own `user_id` field using UUID. Always exclude MongoDB's `_id` with `{"_id": 0}` projection:

```python
import uuid

# Creating new user - generate custom user_id:
user_id = f"user_{uuid.uuid4().hex[:12]}"
await db.users.insert_one({
    "user_id": user_id,  # Your custom ID
    "email": email,
    "name": name,
    "created_at": datetime.now(timezone.utc)
})

# Querying users - ALWAYS exclude _id:
user_doc = await db.users.find_one(
    {"user_id": user_id},
    {"_id": 0}  # REQUIRED: Exclude MongoDB's _id
)
return User(**user_doc)

# Pydantic model (no _id field):
class User(BaseModel):
    user_id: str
    email: str
    name: str
```

MongoDB's `_id` exists internally but is never exposed in your API.

**Authenticator helper (supports BOTH transports).** The shared backend must accept both web cookies and mobile Bearer tokens. Check the `session_token` cookie first, then fall back to the `Authorization: Bearer ...` header. Mobile apps don't send cookies — they always use the Bearer header; web uses the cookie.
- WARNING: Don't use FastAPI's `HTTPAuthorizationCredentials` dependency — it breaks cookie auth and returns 403 instead of 401 when the header is missing.

**Cookie (web responses).** When the request came from web, set the httpOnly cookie with `path="/"`, `secure=True`, `samesite="none"`. Mobile responses just return the `session_token` in the body for the app to store securely.

**expires_at field comparison.** MongoDB stores naive datetimes. Add UTC timezone before comparing:
```python
expires_at = session_doc["expires_at"]
if isinstance(expires_at, str):
    expires_at = datetime.fromisoformat(expires_at)
if expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)
if expires_at < datetime.now(timezone.utc):
    raise HTTPException(status_code=401, detail="Session expired")
```

**Session verification (BEST PRACTICE).** Always verify sessions server-side via `/api/auth/me`. The backend validates the cookie (web) or Bearer token (mobile), checks expiry, and returns user data or 401 — the server is the source of truth.

**User data storage.** If a user exists by email, don't create a new user; reuse the existing `user_id` and update data if necessary.

**Logout.** Web: backend deletes the session and clears the cookie. Mobile: backend deletes the session for the Bearer token; the app clears its stored token.

**MongoDB Indexes.** Create on startup: `users.email` (unique), `users.user_id` (unique), `user_sessions.session_token` (unique), `user_sessions.user_id`, `user_sessions.expires_at` (TTL with expireAfterSeconds=0).

**CORS.** Allow `credentials=True`, all methods, all headers. Web requires the web frontend origin to be allowed (for cookies). Mobile apps don't send an `Origin` header, so allowing the web origin explicitly is sufficient; keep credentials enabled for the web cookie flow.

---

## WEB Frontend Implementation (`/app/frontend`, React — cookie-based)

1. **Login Button.** Do not rely on any environment variable for the redirect URL. Use the browser's location object so the user returns to the exact domain they're on. Do NOT hardcode or add ANY fallbacks (no `|| 'http://localhost'`, no hardcoded `'https://myapp.com/dashboard'`):
```javascript
const redirectUrl = window.location.origin + '/dashboard'; // or your main app route
window.location.href = `https://auth.yourplatform.com/?redirect=${encodeURIComponent(redirectUrl)}`;
```
IMPORTANT: ALWAYS ADD A COMMENT IN THE CODE WHEN INTEGRATING PLATFORM OAUTH, STATING: "REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH". This code is often passed to another agent without this context.

2. **After Google Auth.** User lands at `{redirect_url}#session_id={session_id}`. Frontend detects `session_id` in the URL fragment, processes it silently (no loading UI), calls the backend, then immediately redirects to the dashboard with user data.

3. **Protected Route Pattern (CRITICAL).** Use THREE states: `null` = checking, `true` = authenticated, `false` = not authenticated. Start as `null`, show loading while checking, render only when `true`.
```javascript
const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
// If user data passed from AuthCallback, skip auth check!
```

4. **Routing Structure (CRITICAL — Handles Race Conditions).** Detect `session_id` during render (NOT in useEffect — it runs after first render, too late). This synchronous check processes a new `session_id` FIRST before checking an existing `session_token`.
```javascript
function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) { return <AuthCallback />; }
  return (
    <Routes> {/* your normal routes */} </Routes>
  );
}
```
- AuthCallback useEffect: use `useRef` (not `useState`) for the processed flag, set synchronously at the start: `if (hasProcessed.current) return; hasProcessed.current = true;` — prevents race conditions under StrictMode. Acceptable ONLY for AuthCallback (one-time session exchange that navigates immediately).

5. **Server verification in ProtectedRoute (no timing assumptions).**
```javascript
useEffect(() => {
  if (location.state?.user) return;  // Skip if user passed from AuthCallback
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) throw new Error('Not authenticated');
      const user = await response.json();
      setIsAuthenticated(true);  setUser(user);
    } catch (error) {
      setIsAuthenticated(false);  navigate('/login');
    }
  };
  checkAuth();
}, []);
```

6. **Global AuthProvider Race Condition.** A global AuthProvider's `checkAuth()` runs BEFORE AuthCallback can exchange the `session_id` and set the cookie — causing a 401 on `/auth/me`. Fix: skip the `/auth/me` check if `window.location.hash` contains `session_id=`; let AuthCallback handle it.
```javascript
useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
}, [checkAuth]);
```

---

## MOBILE Frontend Implementation (`/app/mobile`, Expo / React Native — Bearer-based)

1. **Login Button (Platform-Specific Redirect).** On native (`Platform.OS !== 'web'`): use `Linking.createURL('auth')`. On the Expo web preview (`Platform.OS === 'web'`): use `window.location.origin + '/'` pointing to an existing route. Auth URL for both: `https://auth.yourplatform.com/?redirect={encodeURIComponent(redirectUrl)}`. Never use a non-existent route on web (causes "route not found").

2. **Opening the Auth Session.** Native: `WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)` (handles iOS ASWebAuthenticationSession / Android Custom Tabs). Web: `window.location.href = authUrl` (the browser handles the full redirect; `openAuthSessionAsync` is not needed on web).

3. **After Google Auth (native).** The browser auto-dismisses and returns `result`. Read the redirect URL from `result.url` (primary source). Do NOT rely solely on `Linking.addEventListener`. Check `result.type === 'success'` before processing — the user may cancel.

4. **After Google Auth (web preview).** User lands at `{redirect_url}#session_id={session_id}` or `?session_id={session_id}`. On app mount, detect `session_id` in `window.location.hash`/`window.location.search`, process it immediately (before checking existing sessions), then clean the URL with `window.history.replaceState(null, '', window.location.pathname)`.

5. **Process Session ID.** Parse `session_id` from hash or query. The backend exchanges it via the shared session-data flow above. Store the returned `session_token` in `expo-secure-store` (native) or `localStorage` (web preview). Do NOT add `session_token` as a separate parameter when constructing response models — the API response already includes it.

6. **Cold Start Handling (native only).** On mount, check `Linking.getInitialURL()` for a `session_id` (app killed and reopened via deep link). Also register `Linking.addEventListener('url', ...)` for hot links and clean up on unmount. The `openAuthSessionAsync` result is the primary path; deep-link listeners are a fallback. Not needed on web (handled in step 4).

7. **Check existing sessions.** Read the token from `expo-secure-store` (native) or `localStorage` (web). If present, call `/api/auth/me` with `Authorization: Bearer {token}`. If authenticated, navigate to the main app; if 401, clear the stored token.

8. **Auth state.** AuthContext provider with three states: loading (checking on mount), user object (authenticated), null (unauthenticated). Show loading/splash while checking; redirect to login if null; render the app if authenticated.

9. **Logout.** Call the logout endpoint with the Bearer token; backend deletes the session; the app clears the token from `expo-secure-store`/`localStorage` and resets auth state to null. All mobile API calls use `Authorization: Bearer {token}` — never cookies from React Native.

---

## Critical Rules

1. CORS: backend allows requests from the web frontend origin with `credentials=True`. Each frontend uses the backend URL from its `.env` (web → `REACT_APP_BACKEND_URL`, mobile → `EXPO_BACKEND_URL`).
2. Timezones: use timezone-aware datetimes (`datetime.now(timezone.utc)`); normalize MongoDB naive datetimes before comparison.
3. API Structure: backend session/auth endpoints are prefixed with `/api`; frontend calls must include `/api` (e.g. `/api/auth/me`).
4. redirect_url is platform-specific and never hardcoded: web `window.location.origin + '/<route>'`; native `Linking.createURL('auth')`; web preview `window.location.origin + '/'` to an existing route.
5. Transport per platform: web uses httpOnly cookies; mobile uses `Authorization: Bearer {token}`. The shared backend supports both (cookie first, then Bearer).
6. Token storage: web → httpOnly cookie; native → `expo-secure-store`; web preview → `localStorage`. Never AsyncStorage.
7. If `session_id` exists in the URL (hash or query), process it FIRST to avoid race conditions; otherwise check the existing `session_token`.
8. Handle three auth states (loading, authenticated, unauthenticated); show loading while checking.
9. Don't use FastAPI's `HTTPAuthorizationCredentials` dependency.
10. Upsert users by email — don't create duplicates on repeated logins. Exclude `_id` from all MongoDB queries; use the custom `user_id` field.
11. Clear stored token / clear cookie and redirect to login on any 401.
12. Web: clean the URL fragment after processing `session_id` (`window.history.replaceState`). Native: check `result.type === 'success'` and use `Linking.getInitialURL()` as a cold-start fallback.

---

Testing Playbook
IMPORTANT — Before doing anything, save this playbook to /app/auth_testing.md. While calling the testing agent, tell it to read this file.

NOTE — Do not be satisfied until you've tested the app completely, especially the auth-gated pages, on every platform in scope.

Auth-Gated App Testing Playbook

Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,  // Custom UUID field (MongoDB's _id is separate/internal)
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,  // Must match user.user_id exactly
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

Step 2: Test Backend API (shared — works for both platforms via Bearer)
```
# Test auth endpoint
curl -X GET "https://your-app.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "https://your-app.com/api/habits" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Step 3: Browser Testing
- **Web (cookie):** set the `session_token` cookie and navigate.
```
await page.context.add_cookies([{
    "name": "session_token", "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com", "path": "/",
    "httpOnly": true, "secure": true, "sameSite": "None"
}]);
await page.goto("https://your-app.com");
```
- **Mobile (web preview, Bearer/localStorage):** seed the token into `localStorage` before navigation, then load the Expo web preview.
```
await page.add_init_script("window.localStorage.setItem('session_token', 'YOUR_SESSION_TOKEN');")
await page.goto("https://your-app.expo.preview.yourplatform.com")
```

Quick Debug
```
# Check data format
mongosh --eval "use('test_database'); db.users.find().limit(2).pretty(); db.user_sessions.find().limit(2).pretty();"
# Clean test data
mongosh --eval "use('test_database'); db.users.deleteMany({email: /test\.user\./}); db.user_sessions.deleteMany({session_token: /test_session/});"
```

Checklist
- User document has a `user_id` field (custom UUID; MongoDB's `_id` is separate)
- Session `user_id` matches the user's `user_id` exactly
- All queries use `{"_id": 0}` projection
- Backend queries use `user_id` (not `_id`/`id`)
- `/api/auth/me` returns user data (not 401/404) for BOTH cookie (web) and Bearer (mobile)
- Web loads the dashboard (not login page); mobile preview loads the authed app

Success Indicators: ✅ `/api/auth/me` returns user data ✅ App loads without redirect on each platform ✅ CRUD works
Failure Indicators: ❌ "User not found" ❌ 401 Unauthorized ❌ Redirect to login

## Test Identity Tracking
After setting up Google Auth, save relevant test identities to `/app/memory/test_credentials.md`:
- Allowed Google test accounts (email)
- Linked app user IDs
- RBAC roles/permissions mapped to each test account
- Any domain/email allowlist used for access control

Do not store password-based credentials for Google Auth flows, since Google OAuth does not use app-managed passwords.
