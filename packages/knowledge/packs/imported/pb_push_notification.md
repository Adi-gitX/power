# The platform Push Notification Integration Playbook

## Ask User for `google-services.json` (for Android)

**Before writing the code**, ask the user using `ask human` tool to provide their Firebase `google-services.json` file. Android push delivery requires it.

Tell the user (CRITICAL):
1. Open Firebase Console → Project Settings → Your apps → Android app (create one if needed; package name must match `android.package` in `app.json`).
2. Download `google-services.json`.
3. Paste the contents or attach the file in chat.

Save as `frontend/google-services.json`, and wire into `frontend/app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

**If the user has not supplied `google-services.json`** Inform the user that "this is a simple step to enable push notifications on android devices".

Also mandatorily inform that they need to click "Publish" button -> "deploy" the app and then "generate" build -> once the builds are generated for iOS and Android, the feature will work seamlessly

## CRITICAL — Read Before Writing Any Code

**This playbook uses the platform managed push service (SuprSend relay). You MUST implement the backend relay pattern below. Violations:**

- DO NOT use local notifications (`scheduleNotificationAsync`) as a substitute for push.
- DO NOT use Expo Push API (`getExpoPushTokenAsync`). Use ONLY `getDevicePushTokenAsync()` (native FCM/APNs token).
- DO NOT call `https://integrations.yourplatform.com` from the frontend. Only the backend calls it.
- DO NOT skip the backend relay endpoints because `PLATFORM_PUSH_KEY` is missing from the environment. If it's not already in the backend secrets/`.env`, add `PLATFORM_PUSH_KEY=placeholder` yourself. The deployment pipeliner (deployer) replaces it with a real key at build time. Write the code assuming it works. User needs to just "publish" the app, which "deployment" happens first and then "build" will be generated.
- DO NOT skip tap handlers (`addNotificationResponseReceivedListener` + cold-start check). Without them, tapping a push notification does nothing.
- The upstream the platform Push relay sends FCM `notification` payloads (top-level `title`/`body`), so Android's system tray auto-displays in background and killed states. **No native `FirebaseMessagingService` or Expo config plugin is required** for Android delivery.
- DO NOT create the Android channel lazily inside a permission/register flow. Create it at module scope in `app/_layout.tsx` so it exists before any push arrives.
- DO NOT call any `expo-notifications` API on web. Guard module-scope calls with `Platform.OS !== "web"` and early-return from the useEffect on web. APIs like `getLastNotificationResponseAsync`, `addNotificationReceivedListener`, and `addNotificationResponseReceivedListener` are native-only and will crash on web.

## Required Implementation Checklist

When done, ALL of these must exist. Verify before finishing:

**Backend:**
- [ ] `POST /api/register-push` — accepts `{user_id: string, platform: string, device_token: string}`, relays to `POST /api/v1/push/users/register` via `PLATFORM_PUSH_KEY`
- [ ] `send_push()` helper — accepts `recipients: string[]` (array of user IDs), `data: {title: string, message: string}`, relays to `POST /api/v1/push/trigger` via `PLATFORM_PUSH_KEY`
- [ ] `send_push()` called on signup/event to send notification server-side, wrapped in try/except so push failure never blocks the primary operation
- [ ] `PLATFORM_PUSH_KEY=placeholder` added to backend `.env` if not already present

**Frontend (`app/_layout.tsx` at module scope, OUTSIDE any component):**
- [ ] `Notifications.setNotificationHandler(...)` at module scope, guarded with `Platform.OS !== "web"` — controls foreground display behavior (show alert/sound/badge)
- [ ] `Notifications.setNotificationChannelAsync('default', { importance: MAX })` at module scope (Android)

**Frontend (`app/_layout.tsx` inside `useEffect`):**
- [ ] Web guard: early-return if `Platform.OS === "web"`
- [ ] `addNotificationResponseReceivedListener` — warm tap handler, routes via `deeplink` or `action_url`
- [ ] `getLastNotificationResponseAsync()` — cold-start tap check on mount
- [ ] Cleanup: listener `.remove()` in useEffect return

**Frontend (registration flow, after login/app open):**
- [ ] Calls `requestPermissionsAsync()` BEFORE `getDevicePushTokenAsync()`
- [ ] Fetches native token via `getDevicePushTokenAsync()` (NOT `getExpoPushTokenAsync`)
- [ ] POSTs `{user_id, platform, device_token}` to `/api/register-push`
- [ ] Re-registers on every app open (tokens can rotate)

**Config:**
- [ ] `app.json`: `expo-notifications` plugin registered under `expo.plugins`
- [ ] `app.json`: `expo.android.googleServicesFile` set to `"./google-services.json"` (file provided by user after code is written)

## Variables

- `PLATFORM_PUSH_KEY`: API key set by deployer in pod env. Read from `os.environ`. Never mint, rotate, or expose to frontend.
- `PLATFORM_PUSH_BASE_URL`: `https://integrations.yourplatform.com` (constant).
- `user_id`: customer app's authenticated user ID.
- `platform`: `"android"` or `"ios"` (from `Platform.OS`).
- `device_token`: native token from `getDevicePushTokenAsync()`.

## Dependencies

Frontend: `expo-notifications`, `expo-device`, `expo-linking`.

Backend: `fastapi`, `uvicorn`, `httpx>=0.24.0`, `motor`, `python-dotenv`.

## Backend Integration

The backend implements two endpoints and one helper. All upstream calls use `X-Push-Key: $PLATFORM_PUSH_KEY` and a shared `httpx.AsyncClient`. Endpoint paths and bodies are exact — match them verbatim.

```python
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

PUSH_BASE_URL = "https://integrations.yourplatform.com"
PUSH_KEY = os.environ.get("PLATFORM_PUSH_KEY", "placeholder")

_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)

router = APIRouter(prefix="/api")

class RegisterPushBody(BaseModel):
    user_id: str
    platform: str   # "android" | "ios"
    device_token: str

@router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    resp = await _client.post("/api/v1/push/users/register", json=body.model_dump())
    if resp.status_code == 401:
        raise HTTPException(500, "PLATFORM_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()
    return {"status": "registered"}

async def send_push(
    recipients: list[str],
    data: dict,                  # {title, message, subtext?, image_url?, action_url?}
    idempotency_key: str | None = None,
) -> None:
    if not recipients:
        return
    if len(recipients) > 100:
        raise ValueError("max 100 recipients per /trigger call; chunk before sending")
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: dict = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    # Full URL: {PUSH_BASE_URL}/api/v1/push/trigger
    resp = await _client.post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise HTTPException(500, "PLATFORM_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()
```

**Call `send_push()` from your event handler.** Wrap in try/except — push failure should log a warning but never block the primary operation:

```python
@router.post("/signup")
async def signup(payload: SignupRequest):
    user = create_user(payload)
    try:
        await send_push(
            recipients=[user.id],
            data={"title": f"Hey {user.name}!", "message": "Welcome — we're glad to have you here."},
        )
    except Exception as e:
        logger.warning(f"Push notification failed (non-blocking): {e}")
    return user
```

Error mapping: `401` upstream → wrong/missing key (surface as 500). `4xx` → log warning, don't crash caller. `5xx` → retry with backoff.

## Frontend: Reference `app/_layout.tsx`

This is the **complete reference** for everything that MUST be in `app/_layout.tsx`. Copy this structure:

```tsx
// app/_layout.tsx — REFERENCE (everything below MUST be present)
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";

// 1. Foreground handler — MODULE SCOPE, before any component
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// 2. Android channel — MODULE SCOPE, before any component
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    // 3. Warm tap — user taps notification while app is open
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data || {};
        const url = data.deeplink || data.action_url;
        if (!url) return;
        url.startsWith("http") ? Linking.openURL(url) : router.push(url);
      }
    );

    // 4. Cold-start tap — user tapped notification while app was killed
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data || {};
      const url = data.deeplink || data.action_url;
      if (url) {
        url.startsWith("http") ? Linking.openURL(url) : router.push(url);
      }
    });

    // Cleanup
    return () => {
      tapSub.remove();
    };
  }, []);

  return <Stack />;
}
```

### Force-stop caveat

If a user force-stops the app from Android Settings, Android blocks ALL pushes until the user reopens the app. This is an OS-level restriction and cannot be fixed in code.

## Frontend: Push Registration (in your auth/login flow)

After user logs in or on every app open:

```javascript
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

async function registerForPush(user_id: string, backendUrl: string) {
  // Permission FIRST, then token
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const tokenResp = await Notifications.getDevicePushTokenAsync();
  await fetch(`${backendUrl}/api/register-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id,
      platform: Platform.OS,
      device_token: tokenResp.data,
    }),
  });
}
```

Call `registerForPush()` on login AND on every app open. Tokens rotate; the backend upserts safely.

## Send Push Data Contract

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Keep short |
| `message` | yes | Body text |
| `subtext` | no | Android-only |
| `image_url` | no | Must be HTTPS |
| `action_url` | no | For tap-to-navigate; arrives in `data.action_url` (or `data.deeplink`) on the device |
| `$idempotency_key` | no | Recommended for retries |

Max 100 recipients per call — chunk larger audiences.

## Self-Verification (run before finishing)

Grep your codebase. Each symbol MUST appear at least once:

- `addNotificationResponseReceivedListener` — in `app/_layout.tsx`
- `getLastNotificationResponseAsync` — in `app/_layout.tsx`
- `setNotificationChannelAsync` — at module scope in `app/_layout.tsx`, NOT inside a function
- `setNotificationHandler` — at module scope in `app/_layout.tsx`, NOT inside a function
- `getDevicePushTokenAsync` — in registration flow
- `/api/register-push` — backend route AND frontend POST
- `send_push` — backend, called from event handler inside try/except

**If any are missing, you have NOT followed the playbook.**

## Build Notes (Agent Does NOT Edit)

- **Expo Go does not support push.** Only dev-client or standalone builds work.
- iOS APNs mode must match build signing. Mismatch silently drops.
- Do NOT edit `ios.bundleIdentifier` or push-related deployer config — except `expo.android.googleServicesFile`.
- Do NOT store device tokens in your DB. `send_push(recipients=[user_id])` resolves tokens internally via SuprSend.
- NEVER EDIT PLATFORM_PUSH_KEY in .env file, the value will be "placeholder" and AUTOMATICALLY SET in the "deployment pipeline"
