# Sign in with Apple — Mobile Auth Playbook (Expo)

Native Sign in with Apple for Expo React Native (**iOS only**). Client gets an Apple identity token → backend verifies against Apple's JWKS → issues `session_token` (7 days) stored in `expo-secure-store`.

Save the Testing section to `/app/auth_testing.md` before testing.

## Key Concepts

- **identityToken**: JWT from `signInAsync()` — verify on backend, never trust raw.
- **apple_sub**: Token `sub` claim — primary user key (not email).
- **APPLE_AUDIENCES**: Must include **both** your configured `bundleIdentifier` AND `host.exp.Exponent` (Expo Go vs standalone builds).
- **session_token**: Store in `expo-secure-store` (never AsyncStorage). Bearer auth on all API calls.

## Setup

1. Install `expo-apple-authentication` + `expo-secure-store` (frontend), `pyjwt[crypto]` (backend).
2. View(use `view_file` tool) `app.json` file and retrieve the bundle identifier from it. It is in the `expo.ios.bundleIdentifier` key. Don't add custom bundle identifier. Importantly, always use the one from the app.json file.
3. Set `expo.ios.usesAppleSignIn: true` in `app.json` next to `expo.ios.bundleIdentifier`.
4. In backend, use the retrieved bundle identifier in the `.env`: `APPLE_AUDIENCES="<bundle_identifier>,host.exp.Exponent"`.

## Frontend Flow (iOS only)

1. Gate behind `isAvailableAsync()`. Provide alternative auth for Android/web.
2. Render native `AppleAuthenticationButton` (App Store requirement). On press, call `signInAsync` with FULL_NAME + EMAIL scopes.
3. POST `identityToken` to `/api/auth/apple`. On **first sign-in only**, also send name + email (null on later logins).
4. Store returned `session_token` in secure store, navigate to app. Handle cancel gracefully; Toast other errors.
5. On mount: check stored token → call `/api/auth/me` with Bearer header. Three states: loading / authenticated / unauthenticated. Clear token on 401.

## Backend Flow

1. `POST /api/auth/apple` — verify token (RS256 vs Apple JWKS, check issuer + audience + expiry). Upsert user by `apple_sub`. Persist name/email on first sign-in only; never overwrite with nulls. Create 7-day session, return `{session_token, user_id}`.
2. `get_current_user` — Bearer token from `Authorization` header (not cookies). Don't use FastAPI `HTTPAuthorizationCredentials` (403 vs 401).
3. `GET /api/auth/me` + `POST /api/auth/logout`.
4. MongoDB indexes: unique on `apple_sub`, `user_id`, `session_token`; sparse unique on `email`; TTL on `expires_at`.
5. CORS: allow all origins (mobile sends no Origin).

## Critical Rules

1. **APPLE_AUDIENCES** is the #1 failure — must include both bundle id and `host.exp.Exponent`.
2. Key users on `apple_sub`, not email (may be private relay or absent).
3. Name/email returned **only on first sign-in** — save immediately.
4. iOS only. Bearer auth only. Routes prefixed `/api`. Timezone-aware datetimes.

## Testing

Button flow requires real Apple ID on device (manual). Test backend routes with a seeded session.

1. Seed a test user + session in MongoDB.
2. Hit `/api/auth/me` with Bearer token — expect user data.
3. Decode a real identity token — confirm `aud` matches an entry in `APPLE_AUDIENCES`. Wrong `aud` must 401.