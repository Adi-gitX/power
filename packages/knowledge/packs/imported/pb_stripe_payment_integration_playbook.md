# Stripe Checkout API integration

Before implementing anything, add this to the backend .env file in a newline - 
```
STRIPE_API_KEY=sk_test_platform
```
Make sure to call load_dotenv in the backend file


Usage - 

The path to import library is 
```python
from platformintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
```

Create a stripe payment webhook api "/api/webhook/stripe" to handle stripe webhooks.
# Initialize the stripe checkout with stripe API key
```python
host_url = str(http_request.base_url)
webhook_url = f"{{host_url}}/api/webhook/stripe"
stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
```
# To implement checkout status api use
```python
checkout_status : CheckoutStatusResponse = await stripe_checkout.get_checkout_status(checkout_session_id : str)
```
The input and output models of get_checkout_status are:

```python
    Retrieves the status of a Stripe checkout session.

    Input Args:
        checkout_session_id (str): The ID of the checkout session to check.

    Response Model:
    CheckoutStatusResponse(BaseModel):
    """Response model for checkout session status."""
    status: str = Field(..., description="The status of the checkout session")
    payment_status: str = Field(..., description="The payment status")
    amount_total: int = Field(..., description="The total amount in cents")
    currency: str = Field(..., description="The currency code")
    metadata: Dict[str, str] = Field(..., description="The metadata of the checkout session")

```
---



# To create checkout session for Custom amount with currency
```python
checkoutrequest = CheckoutSessionRequest(amount=amount, currency=currency, success_url=success_url, cancel_url=cancel_url, metadata=metadata)
session : CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkoutrequest)
```
# To create checkout session for fixed price stripe product
```python
checkoutrequest = CheckoutSessionRequest(stripe_price_id=stripe_price_id, quantity=quantity, success_url=success_url, cancel_url=cancel_url, metadata=metadata)
session : CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkoutrequest)
```

The input and output models for create_checkout_session are:
```python

    CheckoutSessionRequest(BaseModel):
    """Request model for creating a checkout session."""
    amount: Optional[float] = Field(None, description="The amount to charge in the specified currency")
    currency: str = Field("usd", description="The currency code")
    stripe_price_id: Optional[str] = Field(None, description="The Stripe Price ID to use for the payment")
    quantity: int = Field(1, description="The quantity of items to purchase")
    success_url: Optional[str] = Field(None, description="URL to redirect to after successful payment, should contain the variable session_id={{CHECKOUT_SESSION_ID}} to fill in the session id")
    cancel_url: Optional[str] = Field(None, description="URL to redirect to if payment is cancelled")
    metadata: Optional[Dict[str, str]] = Field(None, description="Additional metadata to store with the session")
    payment_methods: Optional[List[str]] = Field(
        default_factory=lambda: ['card'],
        description="Optional Stripe payment method types. Defaults to ['card']. Can include 'crypto' when crypto payments are explicitly requested and enabled (e.g. ['card', 'crypto'] or ['crypto'])."
    )

  * If the user **explicitly requests to pay with crypto** (e.g., “pay with USDC / stablecoins / crypto”),you may include `"crypto"` in the list:
  * `['crypto']` for crypto-only flows, or
  * `['card', 'crypto']` to offer both card and crypto.
  * When `"crypto"` is included, the **currency must be `usd`**, as required by Stripe’s crypto / stablecoin support.
  * If the user **does not mention crypto**, keep the default: `['card']`.

    CheckoutSessionResponse(BaseModel):
    """Response model for checkout session creation."""
    url: str = Field(..., description="The stripe checkout session URL to redirect the customer to")
    session_id: str = Field(..., description="The ID of the created session")

    ** Optional: to allow crypto (e.g.STABLECOINS,USDC) in addition to cards, when user explicitly asks for crypto **
    checkoutrequest = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=["card", "crypto"]  # or ["crypto"] for crypto only
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkoutrequest)

    
```

# To handle webhook api, call handle_webhook. WebhookEventResponse has fields: event_type, event_id, session_id, payment_status, metadata
```python
webhook_response = await stripe_checkout.handle_webhook(webhook_request_body_bytes, request.headers.get("Stripe-Signature"))
```

The metadata in CheckoutSessionRequest can be used to set parameters which help in identifying and connecting the checkout session with a user/auth 

**MANDATORILY CREATE A NEW COLLECTION payment_transactions while integrating payments, to store the data for each payment transaction.**
Expected Flow:
1. User clicks to initiate payment
2. **Frontend will get the host header via window.location.origin and call the backend api to create checkout session passing the host header to it**
3. **Backend will generate the success_url and cancel_url using the host header and call the function to create checkout session passing the success_url and cancel_url.**
4. **In case of custom amount and currency, the amount and currency should be fetched and set by the backend and should not be sent by the frontend to backend to prevent price manipulation on frontend**
5. **After create checkout session returns, it is MANDATORY TO CREATE AN ENTRY IN payment_transactions TABLE WITH DATA LIKE AMOUNT, CURRENCY, METADATA, SESSION_ID, PAYMENT_ID, USER_ID/EMAIL (ONLY IF AUTH IS ENABLED), AND LASTLY PAYMENT_STATUS field AND ADD IT AS INITIATED OR PENDING.**
6. The user completes payment and is redirected to the frontend via success url
7. The frontend gets the session_id from the url and calls backend to get checkout status
8. **The backend polls the get_checkout_status function to get status of checkout session. upon getting the status, the entry in payment_transactions table is updated with new status and payment_status fields based on success/failure/expiration of the payment request.**
9.Even if there are parallel requests made from frontend/backend to check payment_status, we must not add credits multiple time for the same session_id
10. In the case of cancelation of checkout session, the redirect should be back to the page where payment request was made
11. In case of success, only after updating the status and payment_status in the collection, perform the other related operations.
12. Don't hardcode the success/cancel URLs. Hardcoding the success/cancel urls or picking the frontend url from .env will break the app and flow. 
13. Expose one API /api/webhook/stripe for payment webhooks.

You can expose APIs for above items in backend.
Check the examples in below js content

```js   
// Function to toggle between payment methods
function togglePaymentMethod() {{
    const paymentType = document.querySelector('input[name="paymentType"]:checked').value;
    document.getElementById('amountSection').classList.toggle('active', paymentType === 'amount');
    document.getElementById('priceSection').classList.toggle('active', paymentType === 'price');
}}

// Function to get URL parameters
function getUrlParameter(name) {{
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}}

// Function to update status display
function updateStatus(message, type) {{
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${{type}}`;
}}

// Function to poll payment status
// Caution: You should never miss this since this is the only way we refresh the payment status on the backend given we don't have a webhook. You should always implement a polling mechanism on the UI to ensure payment status is being checked from the UI before proceeding to post-payment processes/screens.

async function pollPaymentStatus(sessionId, attempts = 0) {{
    const maxAttempts = 5;
    const pollInterval = 2000; // 2 seconds

    if (attempts >= maxAttempts) {{
        updateStatus('Payment status check timed out. Please check your email for confirmation.', 'error');
        return;
    }}

    try {{
        const response = await fetch(`/api/payments/v1/checkout/status/${{sessionId}}`);
        if (!response.ok) {{
            throw new Error('Failed to check payment status');
        }}

        const data = await response.json();
        
        if (data.payment_status === 'paid') {{
            updateStatus('Payment successful! Thank you for your purchase.', 'success');
            return;
        }} else if (data.status === 'expired') {{
            updateStatus('Payment session expired. Please try again.', 'error');
            return;
        }}

        // If payment is still pending, continue polling
        updateStatus('Payment is being processed...', 'pending');
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }} catch (error) {{
        console.error('Error checking payment status:', error);
        updateStatus('Error checking payment status. Please try again.', 'error');
    }}
}}

// Function to check if we're returning from Stripe
function checkReturnFromStripe() {{
    const sessionId = getUrlParameter('session_id');
    if (sessionId) {{
        updateStatus('Checking payment status...', 'pending');
        pollPaymentStatus(sessionId);
    }}
}}

async function initiatePayment() {{
    const errorDiv = document.getElementById('error');
    const paymentType = document.querySelector('input[name="paymentType"]:checked').value;
    let requestBody = {{}};

    // Validate based on payment type
    if (paymentType === 'amount') {{
        const amount = parseFloat(document.getElementById('amount').value);
        const currency = document.getElementById('currency').value;

        if (!amount || amount <= 0) {{
            errorDiv.textContent = 'Please enter a valid amount greater than 0';
            return;
        }}

        requestBody = {{
            amount: amount,
            currency: currency
        }};
    }} else {{
        const priceId = document.getElementById('priceId').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value);

        if (!priceId) {{
            errorDiv.textContent = 'Please enter a valid Stripe Price ID';
            return;
        }}

        requestBody = {{
            stripe_price_id: priceId,
            quantity: quantity
        }};
    }}

    try {{
        // Get current URL for success and cancel URLs
        const currentUrl = window.location.href.split('?')[0];
        const successUrl = `${{currentUrl}}?session_id={{CHECKOUT_SESSION_ID}}`;
        const cancelUrl = currentUrl;

        // Add URLs and metadata to request body
        requestBody.success_url = successUrl;
        requestBody.cancel_url = cancelUrl;
        requestBody.metadata = {{
            source: 'web_checkout',
            payment_type: paymentType
        }};

        // Call the checkout session API
        const response = await fetch('/api/payments/v1/checkout/session', {{
            method: 'POST',
            headers: {{
                'Content-Type': 'application/json',
            }},
            body: JSON.stringify(requestBody)
        }});

        if (!response.ok) {{
            throw new Error('Failed to create checkout session');
        }}

        const data = await response.json();
        
        // Redirect to Stripe Checkout
        if (data.url) {{
            window.location.href = data.url;
        }} else {{
            throw new Error('No checkout URL received');
        }}
    }} catch (error) {{
        errorDiv.textContent = error.message;
        console.error('Payment error:', error);
    }}
}}

// Check if we're returning from Stripe when the page loads
document.addEventListener('DOMContentLoaded', checkReturnFromStripe);

```
**ALWAYS KEEP THE AMOUNT IN DECIMAL FORMAT (FLOAT - 1.00) INSTEAD OF INTEGER (1) AS STRIPE DO NOT TAKE IN INTEGERS**Keep the amount as float (1.00) instead of integer (1) for stripe integration
**Caution: You should never miss polling for checkout session status on the UI since this is the only way we refresh the payment status on the backend given we don't have a webhook. You should always implement a polling mechanism on the UI to ensure payment status is being checked from the UI before proceeding to post-payment processes/screens.**

 1. Security Patterns with Examples

```
SECURITY CRITICAL: 
- NEVER accept payment amounts from frontend. Define fixed packages on backend only.
- ALWAYS use dynamic success/cancel URLs constructed from the frontend's origin.

Example implementation:
```python
# Backend: Define fixed packages
PACKAGES = {{"small": 5.0, "medium": 10.0, "large": 20.0}}

@api.post("/checkout")
async def checkout(package_id: str, origin_url: str):
    # Validate package exists
    if package_id not in PACKAGES:
        raise HTTPException(400, "Invalid package")
    
    # Get amount from server-side definition only
    amount = PACKAGES[package_id]
    
    # Build URLs from provided origin
    success_url = f"{{origin_url}}/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{{origin_url}}/cancel"
    
    # Create checkout session
    # ...
```
```

 2. Implementation Checklists

```
STRIPE PAYMENT INTEGRATION CHECKLIST:
✓ Frontend provides origin URL only (window.location.origin)
✓ Backend defines all payment packages and amounts 
✓ Backend creates success/cancel URLs using frontend origin
✓ Payment transaction record created BEFORE redirect to Stripe
✓ Implement polling mechanism on frontend for payment status
✓ Update database only once per successful payment
✓ If crypto is requested & enabled, set `payment_methods` to include "crypto" and enforce currency="usd"
```

 3. Anti-Patterns to Avoid

```
PAYMENT SECURITY ANTI-PATTERNS (DO NOT DO THESE):
❌ Taking price/amount from frontend request
❌ Hardcoding success/cancel URLs
❌ Processing same payment multiple times
❌ Not validating package selection

```

 4. Critical Flows
```
STRIPE PAYMENT FLOW:
1. Frontend → Backend: Send {{ packageId, originUrl }}
2. Backend: Get amount from FIXED PREDEFINED PACKAGES
3. Backend → Stripe: Create checkout with dynamic success/cancel URLs 
4. Backend → Database: Create pending transaction record
5. Backend → Frontend: Return checkout session URL
6. Frontend → Stripe: Redirect user to complete payment
7. Stripe → Frontend: Redirect to success URL with session_id
8. Frontend → Backend: Poll payment status with session_id
9. Backend → Stripe: Verify payment completed
10. Backend → Database: Update transaction only if not already processed
```



To enable crypto payments in your real Stripe account, you don’t need any code changes — you just turn it on from the **Stripe Dashboard**:

1. Log in to your **Stripe Dashboard**.
2. In the bottom-left, click **Settings**.
3. Under **Payments**, click **Payment methods**.
4. In the list of payment methods, find **Crypto**.
5. Click **Turn on / Enable** to activate crypto.

**Important:**

* Crypto payments in Stripe are available **only for selected users in the United States**.
* If crypto is not enabled in your Stripe Dashboard, your API key will **not** work for crypto checkout and the code will fail.
* Always **confirm that crypto is enabled** in your Dashboard before using real API keys for crypto payments.

---

**Stating again, do not ask user for the stripe key, and use the one from the system environment.**