# The platform Mobile Auth Integration Playbook

The platform provides hassle-free email authentication via Google OAuth for Expo React Native apps (iOS, Android, Expo Go, and Expo Web preview).

## Important Variables

- redirect_url: Where user returns after auth. CRITICAL: Platform-specific. On mobile, generate with `Linking.createURL('auth')`. On web (`Platform.OS === 'web'`), use `window.location.origin + '/'` — must point to an existing route.
- session_id: Temporary token in redirect URL (hash or query param) — use once then discard.
- session_token: Persistent auth token (7 days) — store in `expo-secure-store` on mobile, `localStorage` on web. Never use AsyncStorage (unencrypted).

## Dependencies

Frontend: `expo-web-browser`, `expo-linking`, `expo-secure-store`

Backend: `fastapi`, `uvicorn`, `motor`, `httpx>=0.24.0`, `python-dotenv`

## Authentication Flow

1. Login Button (Platform-Specific Redirect)
Determine redirect URL based on platform. On mobile (`Platform.OS !== 'web'`): use `Linking.createURL('auth')` — resolves correctly for Expo Go (`exp://...`) and production builds (`myapp://auth`). On web (`Platform.OS === 'web'`): use `window.location.origin + '/'` — must point to the root or main app route that actually exists in your router. Never use a non-existent route on web — causes "route not found" after redirect. Auth URL for both: `https://auth.yourplatform.com/?redirect={encodeURIComponent(redirectUrl)}`.

2. Opening the Auth Session
On mobile: use `WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)`. This handles browser lifecycle on iOS (ASWebAuthenticationSession) and Android (Custom Tabs). On web: use `window.location.href = authUrl` to navigate directly — `openAuthSessionAsync` is not needed on web since the browser handles the full redirect natively.

3. After Google Auth (Mobile)
Browser auto-dismisses and returns `result` from `openAuthSessionAsync`. Read redirect URL from `result.url` — this is the primary source. Do NOT rely solely on `Linking.addEventListener`. Check `result.type === 'success'` before processing — user may cancel.

4. After Google Auth (Web)
User lands back at `{redirect_url}#session_id={session_id}` or `{redirect_url}?session_id={session_id}`. On app mount (root layout or AuthContext), detect `session_id` in `window.location.hash` or `window.location.search`. Process it immediately — before checking existing sessions. Clean the URL fragment after processing using `window.history.replaceState(null, '', window.location.pathname)`.

5. Process Session ID
Parse `session_id` from the redirect URL — support both hash fragment (`#session_id=...`) and query parameter (`?session_id=...`). Call `https://demobackend.yourplatform.com/auth/v1/env/oauth/session-data` with `X-Session-ID` header. Response: `{"id": "string", "email": "string", "name": "string", "picture": "string", "session_token": "string"}`. Do NOT add `session_token` as a separate parameter when constructing response models — the API response already includes it.

6. Backend Session Storage
Send `session_token` to your backend's session endpoint. Backend verifies with the platform's session-data API using `httpx`, upserts user by email (don't create duplicates), stores session in `user_sessions` collection with `session_token`, `user_id`, timezone-aware `expires_at` (7 days), and `created_at`. Use custom `user_id` field (e.g., `user_{uuid_hex[:12]}`). Store `session_token` in `expo-secure-store` on mobile, or `localStorage` on web.

7. Cold Start Handling (Mobile Only)
On app mount, check `Linking.getInitialURL()` for a `session_id` — handles when app was killed and reopened via deep link. Also register `Linking.addEventListener('url', ...)` for hot links. Clean up listener on unmount. The `openAuthSessionAsync` result is the primary path; deep link listeners are a fallback. Not needed on web — web handles this via URL parsing on mount (step 4).

## Session Management & Security

Check Existing Sessions
Before showing login UI, read token from `expo-secure-store` (mobile) or `localStorage` (web). If present, call `/api/auth/me` with `Authorization: Bearer {token}` header. If authenticated, navigate to main app. If 401, clear stored token.

Authentication Helper
Backend extracts token from `Authorization: Bearer ...` header. Mobile apps use Bearer tokens, not cookies. Look up session by `session_token`, normalize `expires_at` to timezone-aware before comparison (MongoDB may return naive datetimes), then look up user by `user_id`. Exclude `_id` from all MongoDB queries with `{"_id": 0}` projection.
- Warning: Don't use FastAPI's `HTTPAuthorizationCredentials` dependency — it returns 403 instead of 401 when header is missing.

User Data Storage
Save user data to database. If user exists by email, don't create new user; reuse existing `user_id`. Use custom `user_id` field everywhere, never expose MongoDB's `_id`.

Logout
Frontend calls logout endpoint with Bearer token. Backend deletes session from `user_sessions` collection. Frontend clears token from `expo-secure-store` (mobile) or `localStorage` (web) and resets auth state to null.

Auth State
AuthContext provider with three states: loading (checking session on mount), user object (authenticated), null (unauthenticated). Show loading/splash while checking, redirect to login if null, render main app if authenticated.

## MongoDB Indexes

Create on startup: `users.email` (unique), `users.user_id` (unique), `user_sessions.session_token` (unique), `user_sessions.user_id`, `user_sessions.expires_at` (TTL with expireAfterSeconds=0).

## CORS

Mobile apps don't send an `Origin` header, so CORS can allow all origins. If backend also serves a web frontend, add the web origin explicitly. Allow credentials=True, all methods, all headers.

## Critical Rules

1. redirect_url is platform-specific: `Linking.createURL('auth')` on mobile, `window.location.origin + '/'` on web. Never hardcode.
2. On web, redirect must point to an existing route (root `/` or main app route). Non-existent routes cause "route not found" errors.
3. On mobile, use `openAuthSessionAsync` and read from `result.url`. On web, use `window.location.href` redirect and parse URL on mount.
4. If `session_id` exists in URL (hash or query), process it FIRST to avoid race conditions. Otherwise check existing `session_token`.
5. Use `expo-secure-store` for token storage on mobile, `localStorage` on web. Never AsyncStorage.
6. All API calls use `Authorization: Bearer {token}` header. Do not use cookies from React Native.
7. Handle three auth states: loading, authenticated, unauthenticated. Show loading while checking session.
8. Use timezone-aware datetimes (`datetime.now(timezone.utc)`). Normalize MongoDB naive datetimes before comparison.
9. Don't use FastAPI `HTTPAuthorizationCredentials` dependency.
10. Ensure backend route prefixes match frontend calls. If backend uses `/api`, frontend must include `/api` in URLs.
11. Clear stored token and redirect to login on any 401 response.
12. Upsert users by email — don't create duplicates on repeated logins.
13. Exclude `_id` from all MongoDB queries. Use custom `user_id` field.
14. On web, clean URL fragment after processing `session_id` using `window.history.replaceState`.
15. On mobile, check `result.type === 'success'` before processing — handle user cancellation gracefully.
16. Use `Linking.getInitialURL()` as cold-start fallback on mobile only.

## Test Identity Tracking
After setting up Google Auth, save relevant test identities to `/app/memory/test_credentials.md`:
- Allowed Google test accounts (email)
- Linked app user IDs
- RBAC roles/permissions mapped to each test account
- Any domain/email allowlist used for access control

Do not store password-based credentials for Google Auth flows, since Google OAuth does not use app-managed passwords.