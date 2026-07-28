# The platform Auth Integration Playbook

The platform provides hassle-free email authentication via Google OAuth. This version relies entirely on the browser's dynamic location to prevent configuration errors.
There's a testing playbook at the end of this file. Ask the agent to save that playbook to /app/auth_testing.md before moving ahead. 

## Important Variables
- redirect_url: Where user lands after auth - your main app (dashboard or app), NOT (landing page or login page). CRITICAL: Do not hardcode this. Derive it dynamically using `window.location.origin` to prevent environment mismatches.
- session_id: Temporary token in URL fragment - use once then discard  
- session_token: Persistent auth token (7 days) - store in httpOnly cookie

## Authentication Flow

1. Login Button
Do not rely on any environment variable for the redirect URL. Use the browser's location object to ensure the user returns to the exact domain they are currently on:
Do NOT hardcode, or add ANY fallbacks to the redirect URL.
Example:
- Fallback patterns (e.g., `|| 'http://localhost'`, `?? 'http://localhost'`)
- Hardcoded URLs (e.g., `'https://myapp.com/dashboard'`)
<codeExample javascript>
const redirectUrl = window.location.origin + '/dashboard'; // or your main app route
window.location.href = `https://auth.yourplatform.com/?redirect=${encodeURIComponent(redirectUrl)}`;
</codeExample>
IMPORTANT: ALWAYS ADD A COMMENT IN THE CODE WHEN INTEGRATING AND IMPLEMENTING PLATFORM OAUTH, STATING:
"REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH"
Adding this line in code is beneficial in longer runs, as this code is often passed to another agent that does not have this context, so be mindful and always include the above line.

2. After Google Auth
User automatically lands at `{redirect_url}#session_id={session_id}`

3. Process session_id
Frontend detects session_id in URL fragment, processes silently (no loading UI), calls backend, then immediately redirects to dashboard with user data.

Backend endpoint -

- The call to the platform Auth's `/session-data` endpoint MUST be made from  backend, never from the frontend

GET `https://demobackend.yourplatform.com/auth/v1/env/oauth/session-data` 
Header: `X-Session-ID: <session_id>`
Response:
```json
{"id": "string", "email": "string", "name": "string", "picture": "string", "session_token": "string"}
```

4. Backend session storage
Store `session_token` in database with `timezone-aware` expiry (7 days).
Set httpOnly cookie with `path="/"`, `secure=True`, `samesite="none"`.

## Session Management & Security

- Check existing sessions
Before showing login UI, check if `session_token` cookie exists. If authenticated, redirect to main app.

- Authenticator helper
Backend should check `session_token` from cookies first, then Authorization header as fallback.
WARNING: Don't use FastAPI's `HTTPAuthorizationCredentials` dependency - it breaks cookie auth.

- User data storage
Save user data to database. If user exists by email, don't create new user; update existing data if necessary.

- CRITICAL - User ID Pattern (Avoids _id Issues)
Generate your own `user_id` field using UUID. Always exclude MongoDB's `_id` with `{"_id": 0}` projection:

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

- logout
Frontend calls logout endpoint; backend deletes session from database and clears cookie.

- expires_at field comparison
MongoDB stores naive datetimes. Add UTC timezone before comparing:

```python
expires_at = session_doc["expires_at"]
if isinstance(expires_at, str):
    expires_at = datetime.fromisoformat(expires_at)
if expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)
if expires_at < datetime.now(timezone.utc):
    raise HTTPException(status_code=401, detail="Session expired")
```

- Session Verification (BEST PRACTICE)
Always verify sessions server-side via `/auth/me` endpoint. Backend validates cookie, checks expiry, returns user data. Frontend never assumes cookie availability.

```javascript
// ProtectedRoute - Server verification (no timing assumptions)
useEffect(() => {
  if (location.state?.user) return;  // Skip if user passed from AuthCallback
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'  // Send cookies
      });
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

Backend validates session token, checks expiry, returns user or 401. No client-side delays or cookie checks - server is source of truth.


## Critical Rules
1. CORS: Ensure your backend allows requests from your frontend origin (allow credentials=True). Frontend must use the backend URL that is present in .env file.
2. Timezones: Use timezone-aware datetimes (`datetime.now(timezone.utc)`).
3. API Structure: Ensure your custom backend session endpoint matches your API route structure. If your backend uses route prefixes (e.g., `/api`), make sure frontend calls include them (e.g., `/api/auth/session` not `/auth/session`).
4.Auth callback in normal routing: Handle session_id separately, before ProtectedRoute runs.

## Frontend Implementation Guide

### 1. Protected Route Pattern (CRITICAL)
Use THREE states: `null` = checking, `true` = authenticated, `false` = not authenticated. Start as `null`, show loading while checking, render only when `true`.

```javascript
const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
// If user data passed from AuthCallback, skip auth check!
```

### 2. Routing Structure (CRITICAL - Handles Race Conditions)
Detect `session_id` during render (NOT in useEffect). useEffect runs AFTER first render - too late! This synchronous check prevents race conditions by processing new `session_id` FIRST before checking existing `session_token`.

```javascript

function AppRouter() {
  const location = useLocation();
  // Check URL fragment (not query params) for session_id
  if (location.hash?.includes('session_id=')) { return <AuthCallback />; }
  return (
    <Routes> {/* your normal routes */} </Routes>
  );
}
```

- AuthCallback useEffect: Use `useRef` (not `useState`) for the processed flag. Set it synchronously at the start: `if (hasProcessed.current) return; hasProcessed.current = true;` This prevents race conditions under StrictMode. 
Note: This is acceptable ONLY for AuthCallback (one-time session exchange that navigates immediately). Make sure that most effects should be idempotent.


### 3. Authentication Flow Summary
1. Check URL for `session_id` synchronously during render (prevents race conditions)
2. If `session_id` exists: Process it FIRST → Set cookie → Redirect to dashboard.
3. If no `session_id`: Show loading → Check existing `session_token` via `/auth/me` → Render or redirect

### 4. Global AuthProvider Race Condition
When using a global AuthProvider, its `checkAuth()` runs BEFORE the AuthCallback can exchange the `session_id` and set the session cookie — causing a 401 on `/auth/me`.

The Fix:
In your AuthProvider, skip the `/auth/me` check if `window.location.hash` contains `session_id=`.
Let AuthCallback handle authentication in that case.

```javascript
useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
}, [checkAuth]);
```


Testing Playbook
IMPORTANT - Before doing anything, save this playbook to /app/auth_testing.md. While calling testing agent, tell it to read this file.


NOTE -  Do not be satisfied until you've tested the app completely especially the auth gated pages 

Auth-Gated App Testing Playbook
Step 1: Create Test User & Session
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
Step 2: Test Backend API
# Test auth endpoint
curl -X GET "https://your-app.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "https://your-app.com/api/habits" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "https://your-app.com/api/habits" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"name": "Test Habit", "color": "#3B82F6"}'
Step 3: Browser Testing
// Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
await page.goto("https://your-app.com");
Quick Debug
# Check data format
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
Checklist
 User document has user_id field (custom UUID, MongoDB's _id is separate)
 Session user_id matches user's user_id exactly
 All queries use `{"_id": 0}` projection to exclude MongoDB's _id
 Backend queries use user_id (not _id or id)
 API returns user data with user_id field (not 401/404)
 Browser loads dashboard (not login page)
Success Indicators
✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work

Failure Indicators
❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page

## Test Identity Tracking
After setting up Google Auth, save relevant test identities to `/app/memory/test_credentials.md`:
- Allowed Google test accounts (email)
- Linked app users
- RBAC roles/permissions mapped to each test account
- Any domain/email allowlist used for access control

Do not store password-based credentials for Google Auth flows, since Google OAuth does not use app-managed passwords.
