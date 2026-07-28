# Paystack Integration Playbook
NOTE: This playbook and all associated code stubs are provided solely for reference purposes.
## 1. Get API Keys
- Dashboard: https://dashboard.paystack.com → Settings → API Keys & Webhooks
- Test Keys: `sk_test_xxx` (Secret Key - backend only), `pk_test_xxx` (Public Key - frontend)
- Live Keys: `sk_live_xxx`. `pk_live_xxx`. Available after business verification
## 2. Initialize Transaction (Backend)
```python
@api_router.post("/subscription/initialize")
async def initialize_payment(data: PaymentRequest, user: User = Depends(get_current_user)):
    amount_kobo = data.amount * 100  # Currency: Amount must be in smallest unit (NGN → Kobo, multiply by 100)
    reference = f"txn_{uuid.uuid4().hex[:16]}"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "email": data.email,
                "amount": amount_kobo,
                "reference": reference,
                "callback_url": data.callback_url,  # CRITICAL: Must come from frontend
                "metadata": data.metadata  # Optional
            }
        )
        result = response.json()
    if result.get("status"):
        return {
            "authorization_url": result["data"]["authorization_url"],
            "reference": result["data"]["reference"]
        }
    raise HTTPException(400, result.get("message"))
```
## 3. Verify Payment (Backend)
```python
@api_router.get("/subscription/verify/{reference}")
async def verify_payment(reference: str, user: User = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}
        )
        result = response.json()
    if result.get("status") and result["data"]["status"] == "success":
        # Activate subscription, update user plan, fulfill order
        return {"status": "success", "data": result["data"]}
    return {"status": "failed"}
```
## 4. Webhook Handler (Backend)
```python
@api_router.post("/subscription/webhook")
async def paystack_webhook(request: Request):
    signature = request.headers.get("x-paystack-signature")
    body = await request.body()  # Raw bytes required
    # Verify signature using secret key
    computed_signature = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        body,
        hashlib.sha512
    ).hexdigest()
    if not hmac.compare_digest(computed_signature, signature):
        raise HTTPException(401, "Invalid signature")
    event = await request.json()
    if event.get("event") == "charge.success":
        reference = event["data"]["reference"]
        # Process payment, update subscription, fulfill order
    return {"status": "ok"}
```
Register webhook URL: Dashboard → Settings → Webhooks
## 5. Frontend: Initialize Payment
```javascript
const handlePayment = async (plan, email) => {
    const callbackUrl = `${window.location.origin}/payment/callback`;
    const response = await fetch(`${API_URL}/subscription/initialize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            plan: plan,
            email: email,
            callback_url: callbackUrl  // Dynamic callback URL
        })
    });
    const { authorization_url } = await response.json();
    window.location.href = authorization_url;  // Full redirect
};
```
## 6. Payment Callback Page (Frontend)
```javascript
export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    useEffect(() => {
        if (reference) {
            fetch(`${API_URL}/subscription/verify/${reference}`, {
                credentials: 'include'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        window.location.href = '/dashboard';  // Full reload for fresh state
                    } else {
                        // Handle failed payment
                    }
                });
        }
    }, [reference]);
    return <div>Verifying payment...</div>;
}
```
## 7. Going Live Checklist
- Replace all `sk_test_` → `sk_live_` and `pk_test_` → `pk_live_`
- Register webhook URL in Dashboard → Settings → Webhooks
- Enable HTTPS (required for live mode) 
## 8. Common Errors & Fixes
- Redirect to localhost after payment → Pass `window.location.origin + '/payment/callback'` from frontend, not hardcoded URL
- User stuck on checkout page → Include `callback_url` in initialize request
- Invalid amount error → Convert to smallest unit (e.g., convert Naira × 100 = Kobo)
- Webhook signature mismatch → Use secret key (not public), compute HMAC with raw body bytes (UTF-8)
- Session lost after redirect → Use `window.location.href` for full reload, not React Router
- Post-payment react states not updated → Backend commits DB before response; frontend refetches on redirect via flag/polling; destination page fetches fresh data on mount