# Cloudinary API Integration (Images + Videos)

---

## 1. What This Playbook Enables
This playbook enables secure image/video uploads, signed upload params, CDN delivery, safe transformations, reuse of public_id, and validated backend deletions.

---

## 2. Core Cloudinary Concepts (REQUIRED KNOWLEDGE)

 - Cloud Name : Account identifier (public)
 - API Key : App identifier (semi-public)
 - API Secret : Signing secret (backend only)
 - Public ID : `folder/filename` for asset
 - Signed Upload: Backend authorizes uploads by generating a signature; frontend uploads the file directly to Cloudinary using that signature. The API secret stays on the backend
 
CDN URL Pattern:
```
https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{format}
```

---

## 3. REQUIRED API KEYS & SETUP

### 3.1 Get Credentials
1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Create account → Open Dashboard
3. Copy:
   - Cloud Name
   - API Key
   - API Secret

### 3.2 Environment Variables (MANDATORY)
`.env`
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 4. Upload Strategy (CRITICAL)
 - Unsigned upload : Not Allowed
 - Signed frontend → Cloudinary : Allowed (REQUIRED)
 - Backend direct upload : Allowed   (Admin / automation only)
 - Prefer blocking requests over allowing unsafe or partially validated uploads

---

## 5. Backend Configuration (FastAPI)
### 5.1 Install
```bash
pip install cloudinary fastapi python-dotenv
```
### 5.2 Initialize Cloudinary
```python
import cloudinary, os
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)
```

---

## 6. Signed Upload Flow (MANDATORY)
Backend rules:
- Backend validates allowed folder paths before signing.
- Store returned `public_id` in database after successful upload.
- Always verify the Cloudinary response and never retry uploads using invalid or expired signatures.


### Backend: Generate Signature (Images + Videos)
```python
import time, os, cloudinary.utils
from fastapi import APIRouter, Query, HTTPException

router = APIRouter()

@router.get("/api/cloudinary/signature")
def generate_signature(
    resource_type: str = Query("image", enum=["image", "video"]),
    folder: str = "uploads"
):
    ALLOWED_FOLDERS = ("users/", "posts/", "uploads/")
    if not folder.startswith(ALLOWED_FOLDERS):
        raise HTTPException(status_code=400, detail="Invalid folder path")

    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
        "resource_type": resource_type
    }

    signature = cloudinary.utils.api_sign_request(
        params,
        os.getenv("CLOUDINARY_API_SECRET")
    )

    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }
```

---

## 7. Frontend Upload (React)

### 7.1 Image Upload
```javascript
async function uploadImage(file) {
  const sig = await fetch("/api/cloudinary/signature?resource_type=image").then(r => r.json());

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
    { method: "POST", body: form }
  );

  return res.json();
}
```

### 7.2 Video Upload
```javascript
async function uploadVideo(file) {
  const sig = await fetch("/api/cloudinary/signature?resource_type=video").then(r => r.json());

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`,
    { method: "POST", body: form }
  );

  return res.json();
}
```

---

## 8. Media Transformations (STRICT & SAFE)

### Image Transformations (Allowed)
- Resize (`w`, `h`)
- Crop (`c_fill`, `c_fit`, `c_thumb`)
- Quality auto
- Format auto
- Gravity (`face`, `auto`, `center`)
- Radius (`max` only)

### Example:
```
/image/upload/c_fill,w_400,h_400,g_face,q_auto,f_auto/avatar.jpg
```

### Video Transformations (Allowed)
- Resize
- `q_auto`
- `f_auto` (mp4/webm)

### Example:
```
/video/upload/w_720,q_auto,f_auto/sample.mp4
```

---

## 9. Folder & Naming Rules

REQUIRED structure:
```
users/{user_id}/images
users/{user_id}/videos
posts/{post_id}/media
```

---

## 10. Asset Deletion (Backend Only)
```python
cloudinary.uploader.destroy(public_id, invalidate=True)
```

Rules:
- Validate ownership
- The frontend sends a delete request to the backend, which validates asset ownership and then performs the Cloudinary deletion; the frontend never directly calls Cloudinary delete APIs or has delete permissions.
- After Cloudinary deletion succeeds, the backend must also remove the corresponding DB record; deletion is successful only if both steps succeed.

---

