# The platform Object Storage Integration Playbook
## Storage API URL
```
https://integrations.yourplatform.com/objstore/api/v1/storage
```
## API Key
Uses `PLATFORM_LLM_KEY` 
```bash
# backend/.env
PLATFORM_LLM_KEY=sk-platform-xxxxx  # Get from the platform dashboard
```

## Core Pattern
```python
STORAGE_URL = "https://integrations.yourplatform.com/objstore/api/v1/storage"
PLATFORM_KEY = os.environ.get("PLATFORM_LLM_KEY")
APP_NAME = "your-app-name"  # Prefix all paths to avoid bucket collisions
storage_key = None  # Module-level, set once and reused globally
def init_storage():
    """Call ONCE at startup. Returns a session-scoped, reusable storage_key."""
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"platform_key": PLATFORM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key
    
def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file. Returns {"path": "...", "size": 123, "etag": "..."}"""
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()
    
def get_object(path: str) -> tuple[bytes, str]:
    """Download file. Returns (content_bytes, content_type)."""
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
```

## Path Convention
```
{app_name}/uploads/{user_id}/{uuid}.{ext}
```
- No leading slash: `myapp/images/photo.png` (correct), `/myapp/images/photo.png` (wrong)
- Use UUIDs for filenames to prevent collisions.
- Store original filename in the database, not in the path.

## FastAPI Integration
```python
@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
@api_router.post("/upload")

async def upload(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    # Store reference in MongoDB — DB is the source of truth
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return result
    
# Support query param auth for <img src="...?auth=token"> since img tags cannot send headers
@api_router.get("/files/{path:path}")
async def download(path: str, authorization: str = Header(None), auth: str = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    # Auth check with auth_header...
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))
```
## Frontend Image Display
`<img src>` cannot pass Authorization headers. Two options:
Fetch as blob (more secure, no token in URL):
```javascript
const response = await axios.get(`${API}/files/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
});
const blobUrl = URL.createObjectURL(response.data);
// <img src={blobUrl} />
// Clean up: URL.revokeObjectURL(blobUrl) on unmount
```

## Database Pattern (MongoDB)
- After upload, always store the file reference in MongoDB with `is_deleted: False`.
- To "delete" a file, set `is_deleted: True` (soft-delete only — storage has no delete API).
- To "rename", upload to a new path and/ or update the DB reference.
- List files from DB (`find({"is_deleted": False})`), not from the storage API.
- Always use `result["path"]` (the value returned by storage) as the canonical path.

## Content-Type Quick Reference
```python
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "json": "application/json", "csv": "text/csv", "txt": "text/plain"
}
```

## Constraints
- No delete API — implement soft-delete in your DB.
- No rename API — upload to new path, update DB reference.
- No presigned URLs — all access must go through your backend.
- One bucket per user — use app-name prefix to isolate.
- Max list results: 1000 — use prefix filtering.
- Init once — `storage_key` is session-scoped; do not re-init per request.

## Status Codes
- `403 Forbidden`: Invalid/expired `storage_key` or wrong `PLATFORM_LLM_KEY`. Re-call `/init` to get a fresh key.
- `404 Not Found`: Object path doesn't exist. Verify path matches exactly what `put_object` returned.
- `409 Conflict`: Object already exists at that path. Use UUID-based paths; upload to a new path instead of overwriting.
- `429 Too Many Requests`: Rate limited. Retry with exponential backoff (`time.sleep(2 ** attempt)`).

## Common Errors and Fixes
- `storage_key` is `None`: Init failed silently. Add error handling and retry on first operation.
- Image not displaying: Auth header cannot be sent via img src. Use query param auth or fetch-as-blob pattern.
- Upload succeeds but download fails: Path mismatch. Always use `result["path"]` exactly as returned.
- Wrong Content-Type on download: Not set correctly on upload. Always pass the correct MIME type.

## Going Live Checklist
- `PLATFORM_LLM_KEY` is set in production env.
- `storage_key` initializes successfully at startup (check logs).
- All paths are prefixed with the app name.
- File references are stored in DB with `is_deleted` flag.
- Content-types are set correctly on all uploads.
- Backend endpoints serve files (no direct storage URLs exposed to frontend).
- File size limits and content-type validation are in place.
