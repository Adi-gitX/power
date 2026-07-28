Summary: **VERIFIED_PLAYBOOK**

**DISCLAIMER: This is a newly created playbook based on deep research. It has not been verified through testing and should be implemented with caution. Please test thoroughly in a development environment before production use.**

# Razorpay Integration Playbook for FastAPI + React

*Split Payments & Multi-Method Support (2025 India Fintech)*

---

## **1. Installation**

```bash
# Backend (FastAPI)
pip install fastapi uvicorn motor python-dotenv razorpay pydantic

# Frontend (React)
npm install react-razorpay axios

```

---

## **2. API Key Setup**

1. Get `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` from [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Create `.env`:

```
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
MONGODB_URI=mongodb://localhost:27017/fintech

```

---

## **3. FastAPI Backend Setup**

[**app.py**](http://app.py/)

```python
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import razorpay
from pydantic import BaseModel

app = FastAPI()
client = razorpay.Client(auth=(env('RAZORPAY_KEY_ID'), env('RAZORPAY_KEY_SECRET')))
mongo_client = AsyncIOMotorClient(env('MONGODB_URI'))
db = mongo_client.fintech.transactions

class PaymentOrder(BaseModel):
    amount: int  # Paise
    currency: str = "INR"

@app.post("/create-order")
async def create_order(order: PaymentOrder):
    razor_order = client.order.create({
        "amount": order.amount,
        "currency": order.currency,
        "payment_capture": 1
    })
    await db.insert_one({"order_id": razor_order["id"], "status": "created"})
    return razor_order

@app.post("/split-payment/{payment_id}")
async def split_payment(payment_id: str):
    transfer = client.payment.transfer(payment_id, {
        "transfers": [
            {
                "account": "acc_LinkedAccount1",
                "amount": 5000,  # 50 INR
                "currency": "INR"
            },
            {
                "account": "acc_LinkedAccount2",
                "amount": 5000,
                "currency": "INR"
            }
        ]
    })
    await db.update_one({"payment_id": payment_id}, {"$set": {"transfers": transfer}})
    return {"status": "split_completed"}

```

---

## **4. React Frontend Integration**

**PaymentButton.jsx**

```jsx
import { useRazorpay } from 'react-razorpay';

export default function PaymentButton({ amount }) {
  const [Razorpay] = useRazorpay();

  const handlePayment = async () => {
    const response = await axios.post('/create-order', { amount });

    const options = {
      key: process.env.RAZORPAY_KEY_ID,
      amount: response.data.amount,
      currency: "INR",
      order_id: response.data.id,
      handler: async (res) => {
        await axios.post(`/split-payment/${res.razorpay_payment_id}`);
      },
      prefill: {
        name: "User Name",
        email: "user@example.com",
        contact: "9000000000"
      }
    };

    new Razorpay(options).open();
  };

  return <button onClick={handlePayment}>Pay ₹{amount/100}</button>;
}

```

---

## **5. Webhook Verification**

```python
@app.post("/webhook")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get('X-Razorpay-Signature', '')

    client.utility.verify_webhook_signature(
        payload.decode(),
        signature,
        env('RAZORPAY_WEBHOOK_SECRET')
    )

    # Update MongoDB transaction status
    await db.update_one(
        {"payment_id": payload['payment']['id']},
        {"$set": {"status": payload['event']}}
    )
    return {"status": "processed"}

```

---

## **6. Testing Procedures**

1. **Test Cards**: Use Razorpay test cards (4111 1111 1111 1111)
2. **Split Payment Validation**:

```bash
curl -X POST <http://localhost:8000/split-payment/pay_JeLmFCr2qZlUtX> \\
  -H "Content-Type: application/json"

```

1. **Webhook Simulation**: Use [Razorpay Webhook Tester](https://webhook.site/)

---

## **7. Key Security Practices**

1. Never expose API keys in client-side bundles
2. Use environment variables for all credentials
3. Enable HTTPS in production
4. Rotate API keys quarterly
5. Receipt field must be ≤ 40 characters.

---

**Final Checklist**:

- Linked Accounts created in Razorpay Dashboard
- Webhook endpoint registered with signature verification
- Test transactions validated in both successful/failed states

**Required API Keys:**

- RAZORPAY_KEY_ID (obtain from Razorpay Dashboard)
- RAZORPAY_KEY_SECRET (obtain from Razorpay Dashboard)
- RAZORPAY_WEBHOOK_SECRET (for webhook verification)

**Important Notes:**

- This playbook requires setting up Linked Accounts in Razorpay Dashboard for split payments
- All amounts must be in paise (multiply by 100)
- Webhook signature verification is mandatory for security
- Test thoroughly with Razorpay test credentials before going live
