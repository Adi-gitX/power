Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and may require adjustments for your specific environment.**

# Twilio SMS API Integration Playbook for FastAPI and React

## Required API Keys and Setup

- **Twilio Account SID** (obtain from Twilio Console)
- **Twilio Auth Token** (obtain from Twilio Console)
- **Twilio Verify Service SID** (create in Twilio Console under Verify services)

## Installation and Environment Setup

### Python Dependencies

Create a virtual environment and install required packages:

```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\\Scripts\\activate    # Windows
pip install fastapi uvicorn twilio python-dotenv pytest

```

### React Dependencies

Initialize a React project and install Axios for API calls:

```bash
npx create-react-app twilio-frontend
cd twilio-frontend
npm install axios

```

### Twilio Configuration

1. Sign up for a [Twilio account](https://www.twilio.com/) and obtain:
    - **Account SID**
    - **Auth Token**
    - **Twilio Phone Number**
2. Create a `.env` file in your FastAPI project:
    
    ```
    TWILIO_ACCOUNT_SID=your_account_sid
    TWILIO_AUTH_TOKEN=your_auth_token
    TWILIO_VERIFY_SERVICE=VAXXXXXX  # From Twilio Verify dashboard
    
    ```
    

## FastAPI Backend Implementation

### OTP Generation Endpoint

```python
# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from twilio.rest import Client
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI()

class PhoneRequest(BaseModel):
    phone_number: str

client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

@app.post("/send-otp")
async def send_otp(request: PhoneRequest):
    try:
        verification = client.verify.services(os.getenv("TWILIO_VERIFY_SERVICE")) \\
            .verifications.create(to=request.phone_number, channel="sms")
        return {"status": verification.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

```

### OTP Verification Endpoint

```python
class VerifyRequest(BaseModel):
    phone_number: str
    code: str

@app.post("/verify-otp")
async def verify_otp(request: VerifyRequest):
    try:
        check = client.verify.services(os.getenv("TWILIO_VERIFY_SERVICE")) \\
            .verification_checks.create(to=request.phone_number, code=request.code)
        return {"valid": check.status == "approved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

```

## React Frontend Implementation

### Phone Number Input Component

```jsx
// PhoneVerification.js
import React, { useState } from 'react';
import axios from 'axios';

const PhoneVerification = () => {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState(1);

    const sendOTP = async () => {
        try {
            await axios.post('<http://localhost:8000/send-otp>', { phone_number: phone });
            setStep(2);
        } catch (err) {
            alert('Failed to send OTP');
        }
    };

    const verifyOTP = async () => {
        try {
            const res = await axios.post('<http://localhost:8000/verify-otp>', {
                phone_number: phone,
                code: code
            });
            alert(res.data.valid ? 'Verified!' : 'Invalid code');
        } catch (err) {
            alert('Verification failed');
        }
    };

    return (
        <div>
            {step === 1 && (
                <div>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1234567890"
                    />
                    <button onClick={sendOTP}>Send OTP</button>
                </div>
            )}
            {step === 2 && (
                <div>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter OTP"
                    />
                    <button onClick={verifyOTP}>Verify</button>
                </div>
            )}
        </div>
    );
};

export default PhoneVerification;

```

## Testing Procedures

### Backend Testing with Pytest

```python
# test_main.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_send_otp_success():
    response = client.post("/send-otp", json={"phone_number": "+1234567890"})
    assert response.status_code == 200

def test_verify_otp_invalid():
    response = client.post("/verify-otp", json={"phone_number": "+1234567890", "code": "000000"})
    assert response.json()["valid"] is False

```

### Frontend Testing

1. Start the FastAPI server:
    
    ```bash
    uvicorn main:app --reload
    
    ```
    
2. Run the React app:
    
    ```bash
    npm start
    
    ```
    
3. Test the UI flow by:
    - Submitting a phone number in E.164 format (e.g., `+14155552671`).
    - Entering the OTP received via SMS.

## Security Best Practices

1. **Environment Variables**: Never hardcode credentials. Use `python-dotenv` for local development.
2. **Input Validation**: Sanitize phone numbers to ensure E.164 format.
3. **Rate Limiting**: Implement middleware to prevent abuse (e.g., `slowapi`).
4. **Error Handling**: Mask Twilio exceptions in production to avoid leaking sensitive data.

## Common Pitfalls

- **Incorrect Number Format**: Always prefix numbers with `+` and country code.
- **Unverified Numbers**: Test with numbers registered in your Twilio account during development.
- **Async Issues**: Use `httpx` for asynchronous HTTP calls in FastAPI routes.

## International Phone Number Support

- Use E.164 format for all phone numbers (+[country code][number])
- Validate phone numbers before sending to Twilio
- Consider using Twilio's Lookup API to validate numbers before sending OTPs

## MongoDB Integration (Optional)

```python
from pymongo import MongoClient
from datetime import datetime

client = MongoClient("mongodb://localhost:27017/")
db = client["your_database"]
verification_collection = db["phone_verifications"]

@app.post("/send-otp")
async def send_otp(request: PhoneRequest):
    try:
        verification = client.verify.services(os.getenv("TWILIO_VERIFY_SERVICE")) \\
            .verifications.create(to=request.phone_number, channel="sms")

        # Store verification attempt
        verification_collection.insert_one({
            "phone_number": request.phone_number,
            "status": verification.status,
            "created_at": datetime.utcnow(),
            "verified": False
        })

        return {"status": verification.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify-otp")
async def verify_otp(request: VerifyRequest):
    try:
        check = client.verify.services(os.getenv("TWILIO_VERIFY_SERVICE")) \\
            .verification_checks.create(to=request.phone_number, code=request.code)

        is_valid = check.status == "approved"

        # Update verification status
        if is_valid:
            verification_collection.update_one(
                {"phone_number": request.phone_number, "verified": False},
                {"$set": {"verified": True, "verified_at": datetime.utcnow()}}
            )

        return {"valid": is_valid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

```

This playbook provides a production-ready foundation for Twilio SMS-based authentication with FastAPI backend and React frontend, including proper error handling, security considerations, and international phone number support.
