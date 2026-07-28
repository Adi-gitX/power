# Custom Email/Password JWT Authentication Playbook

Custom email/password authentication with JWT tokens for FastAPI + React + MongoDB web apps.
Save the testing playbook at the end of this file to /app/auth_testing.md before moving ahead.

---

## .env Setup

Add to `.env` (double-quote all values):
```
JWT_SECRET="<random-64-char-hex>"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
```

Load env vars at the top of `server.py` before any other imports:
```python
from dotenv import load_dotenv
load_dotenv()

# all other imports below this line
from fastapi import FastAPI
```

---

## Password Hashing

Use the `bcrypt` library:

```python
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
```

---

## JWT Token Management

Use PyJWT. Access token (15 min) + refresh token (7 days). Set as httpOnly cookies on login/register responses.

```python
import os
import jwt
from datetime import datetime, timezone, timedelta

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)
```

Setting cookies on response (use in both login and register):
```python
response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
```

---

## Auth Helper (get_current_user)

Extract token from httpOnly cookie first, fallback to Authorization Bearer header. Verify the token, then confirm the user still exists in MongoDB.

```python
async def get_current_user(request: Request, db) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## Auth Endpoints

All endpoints live under `/api/auth`.

POST `/api/auth/register` — Normalize email to lowercase, check email uniqueness in MongoDB, hash password with `hash_password()`, insert user document, create access + refresh tokens, set httpOnly cookies on the response, return the user object.

POST `/api/auth/login` — Normalize email to lowercase, look up user by email. Check brute force lockout (see Brute Force Protection below). Verify password with `verify_password()`. On success: clear failed login attempts, create access + refresh tokens, set httpOnly cookies, return user. On failure: increment failed attempts in `login_attempts` collection.

POST `/api/auth/logout` (authenticated) — Delete `access_token` and `refresh_token` cookies from the response.

GET `/api/auth/me` (authenticated) — Use `get_current_user` dependency, return the user data.

POST `/api/auth/refresh` — Read `refresh_token` from cookie, decode it, verify type is `"refresh"`, issue a new access token cookie.

POST `/api/auth/forgot-password` — Generate a token with `secrets.token_urlsafe(32)`, store it in `password_reset_tokens` collection with 1hr expiry, log the reset link to console.

POST `/api/auth/reset-password` — Look up the token in `password_reset_tokens`, verify it is not expired and not already used, update the user's `password_hash`, mark the token as used.

---

## CORS Configuration

Use the explicit frontend origin from env. Wildcard `"*"` with `allow_credentials=True` is rejected by browsers.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Admin Seeding

Run as a startup event. Check if admin exists — if not, create it. If it exists but the password in `.env` has changed, update the hash. After seeding, write credentials to `/app/memory/test_credentials.md` (admin email, password, role + test user info + endpoint paths).

```python
async def seed_admin(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({"email": admin_email, "password_hash": hashed, "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
```

---

## Brute Force Protection

Use MongoDB `login_attempts` collection to track attempts by `"{ip}:{email}"`. 5 failed attempts = 15 min lockout. Clear attempts on successful login.

---

## MongoDB Indexes

Create on startup:
```python
await db.users.create_index("email", unique=True)
await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
await db.login_attempts.create_index("identifier")
```

---

## Frontend Implementation

- AuthContext provider with three states: `null` (checking), user object (authenticated), `false` (not authenticated)
- On mount, call `/api/auth/me` with `credentials: 'include'` to check existing session
- All API calls use `withCredentials: true` (axios) or `credentials: 'include'` (fetch) to send cookies
- ProtectedRoute: show loading while checking, redirect to `/login` if not authenticated
- Login/Register forms: call API, update auth context state on success; on failure, map `response.data.detail` to a string before `setState` / JSX — FastAPI 422 validation returns an array of `{msg,...}` objects, not a string, and rendering that value crashes React

```javascript
import axios from "axios";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

try {
  const { data } = await axios.post(
    `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`,
    { email, password },
    { withCredentials: true }
  );
  setUser(data);
} catch (e) {
  setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
}
```

Use the same `catch` pattern for register, forgot-password, and reset-password.

---

## test_credentials.md

After setting up auth, ALWAYS write admin and test credentials to `/app/memory/test_credentials.md`:
- Admin email, password, role
- Test user email, password, role
- List of auth endpoint paths

---

## Testing Playbook

Save this section to `/app/auth_testing.md` before testing. Tell the testing agent to read that file.

Step 1: MongoDB Verification
```
mongosh
use <database_name>
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at (TTL).

Step 2: API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}'
cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
```

Login should return the user object and set `access_token` + `refresh_token` cookies. The `/me` call should return the same user using those cookies.
