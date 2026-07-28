Great! The process has completed. Now I have the complete PayPal integration playbook. Let me provide the full unverified playbook as requested.
Summary: **VERIFIED_PLAYBOOK: PayPal API Integration for Rental Payments**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through implementation testing.**

**REQUIRED API KEYS:**

- PayPal Client ID and Secret (obtain from https://developer.paypal.com/)

# PayPal Integration Playbook for Rental Payments

## 1. Installation & Setup

**Backend (FastAPI):**

```bash
pip install fastapi uvicorn motor paypal-checkout-serversdk python-dotenv

```

**Frontend (React):**

```bash
npm install @paypal/react-paypal-js axios

```

---

## 2. PayPal API Configuration

**`.env` File:**

```python
PAYPAL_CLIENT_ID=YOUR_CLIENT_ID
PAYPAL_SECRET=YOUR_SECRET
MONGODB_URL=mongodb://localhost:27017/rental_payments

```

**FastAPI Config (`core/config.py`):**

```python
from paypalcheckoutsdk.core import SandboxEnvironment
from motor.motor_asyncio import AsyncIOMotorClient
import os

# PayPal Client
paypal_client = SandboxEnvironment(
    client_id=os.getenv("PAYPAL_CLIENT_ID"),
    client_secret=os.getenv("PAYPAL_SECRET")
).client()

# MongoDB
mongo_client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = mongo_client["rental_payments"]

```

---

## 3. Backend Implementation (FastAPI)

**Routes (`main.py`):**

```python
from fastapi import FastAPI, HTTPException, Request
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersCaptureRequest

app = FastAPI()

# Create Payment Order
@app.post("/api/orders")
async def create_order(property_id: str, amount: float):
    request = OrdersCreateRequest()
    request.prefer('return=representation')
    request.request_body = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": property_id,
            "amount": {"currency_code": "USD", "value": f"{amount}"}
        }]
    }
    response = await app.state.paypal_client.execute(request)
    return response.result.dict()

# Capture Payment
@app.post("/api/orders/{order_id}/capture")
async def capture_order(order_id: str):
    request = OrdersCaptureRequest(order_id)
    response = await app.state.paypal_client.execute(request)
    await db.payments.insert_one({
        "property_id": response.result.purchase_units[0].reference_id,
        "status": response.result.status,
        "amount": response.result.purchase_units[0].amount.value
    })
    return response.result.dict()

# Webhook Endpoint
@app.post("/api/webhooks")
async def webhook_listener(request: Request):
    data = await request.json()
    # Validate using [6]'s cryptography method
    if validate_webhook_event(data, request.headers):
        if data["event_type"] == "PAYMENT.CAPTURE.COMPLETED":
            # Update payment status in MongoDB
            pass
    return {"status": "processed"}

```

---

## 4. Frontend Implementation (React)

**PayPal Button Component:**

```jsx
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function Payment({ propertyId, amount }) {
  return (
    <PayPalScriptProvider options={{ clientId: process.env.PAYPAL_CLIENT_ID }}>
      <PayPalButtons
        createOrder={() => fetch("/api/orders", {
          method: "POST",
          body: JSON.stringify({ propertyId, amount })
        }).then(res => res.data.id)}
        onApprove={data => fetch(`/api/orders/${data.orderID}/capture`)}
      />
    </PayPalScriptProvider>
  );
}

```

---

## 5. Payment Tracking & Late Fees

**MongoDB Schema:**

```python
# payments collection
{
  "user_id": ObjectId,
  "property_id": ObjectId,
  "amount": float,
  "due_date": datetime,
  "paid_date": datetime,
  "late_fee": float,
  "status": "pending/paid/late"
}

# Calculate Late Fees (Python)
from datetime import datetime

def calculate_late_fee(due_date: datetime, amount: float):
    days_late = (datetime.now() - due_date).days
    return max(0, days_late) * (amount * 0.02)  # 2% daily fee

```

---

## 6. Multi-Property Support

**Property Configuration (MongoDB):**

```python
# properties collection
{
  "_id": ObjectId,
  "name": "Beach Villa",
  "late_fee_rate": 0.02,
  "payment_terms": 30  # days
}

```

---

## 7. Testing & Security

1. **Sandbox Testing:** Use PayPal's sandbox accounts [2][8].
2. **Webhook Simulation:** Test via PayPal Developer Dashboard [5].
3. **Security:**
    - Store secrets in environment variables.
    - Validate webhook signatures [6].
    - Use MongoDB role-based access control.

---

## 8. Common Pitfalls

- **Time Zones:** Ensure all dates are UTC.
- **Async Operations:** Use `async/await` consistently in FastAPI.
- **Error Handling:** Catch `paypalhttp.HttpError` for API issues.

**[Source References: 1,2,5,6,8,22,28]**

---

**Next Steps:**

1. Implement idempotency keys for payment retries.
2. Add email notifications using Celery async tasks.
3. Deploy with HTTPS for webhook security.