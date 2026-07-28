Summary: VERIFIED_PLAYBOOK

DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through extensive testing like our verified playbooks. Please test thoroughly in your development environment before production use.

REQUIRED API KEYS/SETUP:

1. Firebase Project Setup: Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com/)
2. Service Account Key: Download the Firebase Admin SDK service account JSON file from Firebase Console > Project Settings > Service Accounts
3. Web App Configuration: Register your web app in Firebase Console to get the client-side configuration keys

# Comprehensive Integration Guide for Firebase with React Frontend and FastAPI Backend (2024-2025)

This technical playbook provides a complete implementation strategy for integrating Firebase services into modern web applications using React (v19+) and FastAPI (v0.110+). The guide emphasizes secure credential management, production-ready architecture, and full-stack synchronization across authentication, Firestore, and Cloud Storage services.

## Backend Configuration with FastAPI and Firebase Admin SDK

### Service Account Initialization

Create dedicated service credentials through Firebase Console > Project Settings > Service Accounts. Generate a new private key and store it as `firebase-admin.json` in your project's `secrets/` directory.

```python
# firebase_admin.py
import firebase_admin
from firebase_admin import credentials, firestore, storage

cred = credentials.Certificate('secrets/firebase-admin.json')
firebase_app = firebase_admin.initialize_app(cred, {
    'storageBucket': 'your-project.appspot.com'
})

firestore_client = firestore.client()
storage_bucket = storage.bucket()

```

### Secure Environment Management

Implement hierarchical configuration using Pydantic's BaseSettings with environment variable fallbacks:

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    firebase_project_id: str = "your-project-id"
    firebase_web_api_key: str = "your-web-key"

    class Config:
        env_file = ".env"

```

## Frontend React Implementation with Modular SDK

### Environment Configuration

Store Firebase client credentials in `.env.local` using Vite-compatible prefixes:

```
REACT_APP_FIREBASE_API_KEY=AIzaSy...your-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### SDK Initialization

Implement modular Firebase initialization with lazy loading:

```jsx
// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, isSignInWithEmailLink } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

export function getFirebase() {
  return getApps()[0] || initializeApp(firebaseConfig)
}

```

## Authentication Flow Implementation

### Token Verification Middleware

Create FastAPI dependency for JWT validation:

```python
# dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def firebase_authenticated(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    try:
        decoded = auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as e:
        raise HTTPException(401, f"Authentication failed: {str(e)}")

```

### React Auth Context Provider

Implement global state management for user sessions:

```jsx
// AuthProvider.jsx
import { createContext, useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const auth = getAuth()
    return onAuthStateChanged(auth, (user) => {
      setUser(user?.toJSON())
    })
  }, [])

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

```

## Firestore Data Management Patterns

### Backend CRUD Operations

Implement atomic document operations with transaction support:

```python
# firestore_service.py
from google.cloud import firestore

async def update_user_profile(uid: str, data: dict) -> None:
    user_ref = firestore_client.collection('users').document(uid)
    await user_ref.set(data, merge=True)

```

### Frontend Real-time Listener

Create React hook for live document updates:

```jsx
// useDocument.js
import { useEffect, useState } from 'react'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'

export function useDocument(path) {
  const [data, setData] = useState(null)

  useEffect(() => {
    const db = getFirestore()
    const unsubscribe = onSnapshot(doc(db, path), (snap) => {
      setData(snap.data())
    })
    return unsubscribe
  }, [path])

  return data
}

```

## Cloud Storage Integration

### Secure File Upload Endpoint

Implement signed URL generation for frontend uploads:

```python
# storage.py
from datetime import timedelta

def generate_upload_url(filename: str) -> str:
    blob = storage_bucket.blob(f"uploads/{filename}")
    return blob.generate_signed_url(
        expiration=timedelta(minutes=15),
        version='v4'
    )

```

### React File Upload Component

Create drag-and-drop interface with progress tracking:

```jsx
// FileUploader.jsx
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage'

export function FileUploader() {
  const handleUpload = async (file) => {
    const storage = getStorage()
    const fileRef = ref(storage, `uploads/${file.name}`)
    const uploadTask = uploadBytesResumable(fileRef, file)

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        console.log(`Upload progress: ${progress}%`)
      },
      (error) => console.error(error),
      () => console.log('Upload complete')
    )
  }

  return <input type="file" onChange={e => handleUpload(e.target.files[0])} />
}

```

## Security Implementation Checklist

1. Credential Isolation
    - Never commit `firebase-admin.json` to version control
    - Use environment variables for client credentials
    - Implement Git ignore patterns for sensitive files
2. Database Security Rules
    
    ```
    // firestore.rules
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    ```
    
3. Storage Access Control
    
    ```
    // storage.rules
    match /uploads/{fileName} {
      allow write: if request.auth != null;
      allow read: if true;
    }
    
    ```
    

## Testing Methodology

### Backend Integration Tests

```python
# test_auth.py
def test_protected_route(client):
    valid_token = "your-test-token"
    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.status_code == 200

```

### Frontend Component Tests

```jsx
// AuthButton.test.jsx
test('shows login when unauthenticated', () => {
  render(
    <AuthProvider>
      <AuthButton />
    </AuthProvider>
  )
  expect(screen.getByText('Sign In')).toBeInTheDocument()
})

```

## Production Deployment Checklist

1. Containerization
    
    ```
    FROM python:3.11-slim
    ENV GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/firebase-admin.json
    COPY . /app
    RUN pip install -r requirements.txt
    CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
    
    ```
    
2. CI/CD Pipeline
    
    ```yaml
    # .github/workflows/deploy.yml
    jobs:
      deploy:
        steps:
          - name: Set up Firebase
            run: echo "${{ secrets.FIREBASE_ADMIN }}" > secrets/firebase-admin.json
    
    ```
    

## Common Integration Pitfalls

Authentication Persistence
Configure auth state persistence in React applications to maintain sessions across page reloads:

```jsx
import { setPersistence, browserSessionPersistence } from 'firebase/auth'

const auth = getAuth()
await setPersistence(auth, browserSessionPersistence)

```

CORS Configuration
Enable proper CORS settings in FastAPI middleware:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["<https://your-react-app.com>"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

```

Firebase Admin Singleton Pattern
Prevent multiple Firebase instances in serverless environments:

```python
if not firebase_admin._apps:
    firebase_app = firebase_admin.initialize_app()

```
## Agent Execution & Pre-Implementation Guardrails (MANDATORY)
- Do not proceed without Firebase Admin credentials and required client config.
- Before writing any code, explicitly confirm required services (Auth, Firestore, Storage) are enabled
- Identify frontend platform explicitly (Web React vs Expo); do not assume.
- User documents must be keyed by `uid`; first write must use `set(..., merge=True)`.
- If rules or console steps cannot be verified, warn the user and re-request confirmation on any related failure.
- IMPORTANT: If any prerequisite or validation fails, STOP and request user action. Re-prompt on related failures until confirmed.
- When multiple Firebase features are requested, execute step-by-step with validation between steps.

## Backend Sanity Check (Required Before Declaring Success)
Run a minimal Firebase Admin + Firestore write test to validate credentials and access, example code:
```python
python3 -c "
import firebase_admin
from firebase_admin import credentials, firestore
cred = credentials.Certificate('firebase-admin.json')
app = firebase_admin.initialize_app(cred)
db = firestore.client()
db.collection('_health_check').document('test').set({'status': 'ok'})
db.collection('_health_check').document('test').delete()
print('Firebase Admin SDK + Firestore: WORKING')
"
```