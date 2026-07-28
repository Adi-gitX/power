STRIPE_PAYMENT_INTEGRATION_PLAYBOOK_COMBINED

Default to Flow A. Use Flow B only when the user explicitly says "use my own Stripe key" / "I have a Stripe account" / or volunteers a key. When Flow B applies, skip Flow A — do not call `POST /stripe/sandboxes`. Read `STRIPE_API_KEY` from env (the default value `sk_test_platform` is already set) and never ask the user for a key.

The pre-injected `STRIPE_API_KEY=sk_test_platform` env var is NOT a signal to use Flow B. The platform pre-injects it as a fallback for the Flow B path; its presence alone says nothing about which flow to pick. Do not pick Flow B because it looks "simpler" or because env values are already there — Flow A is the default and you must run A1 (`POST /stripe/sandboxes`) unless the user has explicitly volunteered their own key.

- Flow A — Claimable sandbox (default): no Stripe account or keys needed from the user; raw `stripe` SDK. Tax-handling mode is selected automatically in A4 (based on catalog + country) and surfaced to the user in the finish summary.
- Flow B — user supplies their own Stripe key (only when they ask): key from env `STRIPE_API_KEY`, `platformintegrations` library, webhook at `/api/webhook/stripe`.

## Pre-integration — infer, don't ask

Read prior turns. Products/pricing (`$9/mo Starter` → digital subscription; t-shirts → physical; tip jar → one-time), app domain, country (default US).
Provision the sandbox (A1), wire env (A2), and set up the catalog (A3) without asking. Tax mode is selected automatically in A4 — no ask required; keep going.

## Common rules

- Frontend sends `{lookup_key, origin_url: window.location.origin}` — never amounts.
- Backend builds `success_url=f"{origin_url}/payment/success?session_id={CHECKOUT_SESSION_ID}"`, `cancel_url=f"{origin_url}/payment/cancel"`.
- Insert `payment_transactions` (Mongo) BEFORE redirect: `status="initiated"`, `payment_status="pending"`. Frontend polls `GET /api/payments/status/{session_id}`; never advance past success without confirming `paid`.
- Webhook idempotent: guard `payment_status != "paid"`.
- `/status/{session_id}` is unauthenticated — return only `session_id`/`status`/`payment_status`.
- CORS for preview proxy: `allow_credentials=True`, reflected `Origin` (not `"*"`), frontend `withCredentials: true`, cross-subdomain cookie `Domain`.
- Amount as float; never integer. Test card `4242 4242 4242 4242`, any future expiry, any CVC.

---

## Flow A — Claimable sandbox (DEFAULT)

### A1. Provision (idempotent — retry returns existing)

The `job_id` and `key` shown below are pre-substituted by the platform to the exact values that work for this run. Copy them verbatim — do NOT replace them with `os.environ["run_id"]`, a fresh `uuid4()`, or any other value. The proxy will return `404 job not found` for any other id.

```python
base   = os.environ["INTEGRATION_PROXY_URL"]
job_id = "{job_id}"
key    = "{platform_llm_key}"
req = urllib.request.Request(
    base + "/stripe/sandboxes",
    data=json.dumps({"job_id": job_id}).encode(),
    headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as r:
    sandbox = json.load(r)
# Keys: sandbox_secret_key, sandbox_publishable_key, sandbox_account_id, onboarding_url, preview_webhook_secret

stripe.api_key = sandbox["sandbox_secret_key"]
# SMP needs (use_smp_country AND goods are digital). Otherwise write OCS-only code in A4.
use_smp_country = stripe.Account.retrieve()["country"] in {
    "AU","AT","BE","BG","CA","HR","CY","CZ","DK","EE","FI","FR","DE","GI","GR",
    "HK","HU","IE","IT","JP","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO",
    "SG","SK","SI","ES","SE","CH","GB","US"
}
```

Share `onboarding_url` with the user as a markdown hyperlink (e.g. `[claim your Stripe account](<onboarding_url>)`), never paste the raw URL.

If this POST fails (e.g. 404 / network error), do NOT fall back to Flow B. Re-check that you copied `job_id` and `key` verbatim from the block above, then retry.

### A2. Env vars (auto-injected on deploy; preview values already present)

```
STRIPE_SECRET_KEY=<sandbox_secret_key>
STRIPE_PUBLISHABLE_KEY=<sandbox_publishable_key>
STRIPE_ACCOUNT_ID=<sandbox_account_id>
STRIPE_WEBHOOK_SECRET=<preview_webhook_secret>
STRIPE_MODE=test
```

```python
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_platform"
```

### A3. Catalog setup (`setup_stripe.py`, idempotent)

Tax code per product — pick the one that matches; wrong code breaks SMP eligibility and tax calculation, so don't guess. Common ones: `txcd_10103001` (SaaS), `txcd_10000000` (general digital), `txcd_10302000` (digital content), `txcd_99999999` (physical, OCS-only). For anything that doesn't clearly match these, look it up via `stripe.TaxCode.list()` and match by product description before assigning.

```python
CATALOG = [
    {
        "platform_product_id": "starter_plan",  # stable id, dedupes via metadata
        "name": "Starter Plan",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "starter_monthly", "amount": 900,  "currency": "usd", "interval": "month"},
            {"lookup_key": "starter_yearly",  "amount": 8640, "currency": "usd", "interval": "year"},
            # one-time: omit "interval"
        ],
    },
]

def ensure_tax_settings(country, line1, city, state="", postal_code=""):
    s = stripe.tax.Settings.retrieve()
    if s.head_office and getattr(s.head_office, "address", None):
        return
    stripe.tax.Settings.modify(
        head_office={"address": {"country": country, "line1": line1,
            "city": city, "state": state, "postal_code": postal_code}},
        defaults={"tax_behavior": "exclusive"},
    )

def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("platform_product_id") == entry["platform_product_id"]:
            return p
    return stripe.Product.create(name=entry["name"], tax_code=entry.get("tax_code"),
        metadata={"managed_by": "platform", "platform_product_id": entry["platform_product_id"]})

# Per price under a product:
existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
    stripe.Price.modify(existing[0].id, active=False)
    existing = []
if not existing:
    kwargs = dict(product=product.id, unit_amount=p["amount"], currency=p["currency"],
        lookup_key=p["lookup_key"], transfer_lookup_key=True)
    if p.get("interval"):
        kwargs["recurring"] = {"interval": p["interval"]}
    stripe.Price.create(**kwargs)
```

### A4. Checkout, status, webhook

Set `tax_mode` **before** creating the checkout session — the code below branches on this exact value, so use these strings verbatim (not "SMP"/"OCS"):

1. `tax_mode = "full"` (→ SMP) — catalog has digital products AND the sandbox country is SMP-supported (see A1 list). Also the no-catalog default in an SMP-supported country.
2. `tax_mode = "calc_only"` (→ OCS + Stripe Tax) — catalog has no digital products OR the sandbox country isn't SMP-supported. Also the no-catalog default in a non-SMP country.
3. `tax_mode = "diy"` (→ OCS only) — only if the user has explicitly asked for no tax help. Never pick this as an automatic default.

```python
payments_router = APIRouter()
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_platform"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
payment_transactions = MongoClient(os.environ["MONGO_URL"])[os.environ.get("DB_NAME", "app")]["payment_transactions"]

class CheckoutRequest(BaseModel):
    lookup_key: str
    quantity: int = Field(1, ge=1, le=100)
    origin_url: str
    user_id: Optional[str] = None

@payments_router.post("/api/payments/checkout")
async def create_checkout(req: CheckoutRequest):
    prices = stripe.Price.list(lookup_keys=[req.lookup_key], active=True, limit=1).data
    if not prices:
        raise HTTPException(500, f"Price not found: {req.lookup_key}")
    price = prices[0]
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": req.quantity}],
        mode="subscription" if price.recurring else "payment",
        success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/payment/cancel",
        metadata={"user_id": req.user_id or "", "lookup_key": req.lookup_key},
    )
    # tax_mode set above in A4 — "full" / "calc_only" / "diy"
    if tax_mode == "full":
        try:
            session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
        except stripe.error.InvalidRequestError as e:
            msg = (e.user_message or "").lower()
            if "managed payments" in msg or "ineligible" in msg:
                # Ineligible for SMP — fall back to Stripe Tax (option b behavior)
                session = stripe.checkout.Session.create(
                    **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required",
                )
            else:
                raise
    elif tax_mode == "calc_only":
        # Stripe Tax must be enabled in the Dashboard for this to work in live mode
        session = stripe.checkout.Session.create(
            **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required",
        )
    else:  # "diy"
        session = stripe.checkout.Session.create(**kwargs)
    payment_transactions.insert_one({
        "session_id": session.id, "user_id": req.user_id, "lookup_key": req.lookup_key,
        # amount_total is None for subscription sessions at create time — compute from price.
        "amount": (price.unit_amount or 0) * req.quantity, "currency": price.currency,
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    })
    return {"checkout_url": session.url, "session_id": session.id}

@payments_router.get("/api/payments/status/{session_id}")
async def get_status(session_id: str):
    record = payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(404, "Transaction not found")
    # Webhook fallback: webhooks can be delayed or unreachable in some environments,
    # so while the record is still pending, ask Stripe directly. If Stripe says paid,
    # flip the DB inline using the SAME idempotent guard as the webhook — whichever
    # path completes first wins. Future polls resolve on the first tick (~2s).
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "stripe_subscription_id": s.subscription,
                              "stripe_payment_intent_id": s.payment_intent,
                              "updated_at": datetime.now(timezone.utc)}},
                )
                record = payment_transactions.find_one({"session_id": session_id})
        except stripe.error.StripeError:
            pass  # transient Stripe error — fall through to whatever's in DB
    return {"session_id": record["session_id"],
            "status": record["status"],
            "payment_status": record["payment_status"]}

@payments_router.post("/api/stripe/webhook")  # exact path — Stripe is registered to deliver here
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "stripe_subscription_id": obj.get("subscription"),
                      "stripe_payment_intent_id": obj.get("payment_intent"),
                      "updated_at": datetime.now(timezone.utc)}},
        )
    elif t == "checkout.session.async_payment_succeeded":
        payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}})
    elif t == "checkout.session.async_payment_failed":
        payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"status": "failed", "payment_status": "failed", "updated_at": datetime.now(timezone.utc)}})
    elif t == "checkout.session.expired":
        payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"status": "expired", "payment_status": "expired", "updated_at": datetime.now(timezone.utc)}})
    elif t == "charge.refunded":
        payment_transactions.update_one({"stripe_payment_intent_id": obj.get("payment_intent")},
            {"$set": {"status": "refunded", "payment_status": "refunded", "updated_at": datetime.now(timezone.utc)}})
    return {"status": "ok"}
```

Register: `app.include_router(payments_router)`. Crypto (US, Dashboard toggle required): omit `managed_payments`, set `payment_method_types=["card","crypto"]`, `currency="usd"`.

Refunds (full or partial):
```python
stripe.Refund.create(payment_intent=pi_id)                       # full
stripe.Refund.create(payment_intent=pi_id, amount=500)           # partial (cents)
```
The `charge.refunded` webhook (already handled in A4) will sync the DB.

Invoices (one-off, outside subscriptions):
```python
inv = stripe.Invoice.create(customer=cust_id, collection_method="send_invoice", days_until_due=14)
stripe.InvoiceItem.create(customer=cust_id, invoice=inv.id, price=price_id)  # or amount=...
stripe.Invoice.finalize_invoice(inv.id)
```

### A5. Lifecycle, switching, forking

Reuses `base`, `job_id`, and `key` from A1.

```python
# Status
urllib.request.Request(base + f"/stripe/jobs/{job_id}/sandbox",
    headers={"Authorization": "Bearer " + key}, method="GET")

# Delete (explicit user request only — loses all products/pricing)
urllib.request.Request(base + f"/stripe/jobs/{job_id}/sandbox",
    headers={"Authorization": "Bearer " + key}, method="DELETE")
```

Before calling DELETE, you MUST ask the user with `ask_human` to clarify intent — never DELETE on assumption. After DELETE, the sandbox keys in `.env` and any Stripe code in the app are stale; deploying as-is will fail, so the cleanup branch below must run in the same turn as DELETE. Do not leave the app in a half-deleted state.

Ask (plain English):
> "Before I delete the sandbox — what's the goal? (a) Remove payments entirely from the app, or (b) Provision a brand-new sandbox to replace this one?"

Then act on the answer:
- (a) No payments: DELETE the sandbox, remove ALL Stripe code (checkout routes, webhook, frontend payment UI, imports) AND the Stripe values from `backend/.env` (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_ACCOUNT_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MODE`, `STRIPE_API_KEY`). Nothing Stripe-related should remain.
- (b) Fresh sandbox: DELETE, then in the same turn run A1 (`POST /stripe/sandboxes`), overwrite the `.env` values from the new sandbox response, and re-run A3 to recreate the catalog. Do not leave the old keys in `.env` between the DELETE and the new POST.

States: `unclaimed` → `claimed` → `account_activated` → `app_installed_in_live_mode` | `expired`. If `expired` or unclaimed 60+ days: DELETE + POST to re-provision, share new `onboarding_url`.

Forked jobs: `POST /stripe/sandboxes` is idempotent on `job_id`. On a fork, calling it just returns the parent's sandbox — no duplication. If the parent had no sandbox, a fresh one is provisioned for the fork. The agent doesn't need special "is this a fork?" handling — just call POST as normal.

Switching Flow A ↔ Flow B (only on explicit user ask):
- Sandbox → BYOK: FIRST nudge the user — "Claiming the sandbox takes one click on `onboarding_url` and gives you a real Stripe account; that's usually the simpler path." Only if they still insist, DELETE the sandbox and wire their key into `STRIPE_API_KEY` per Flow B.
- BYOK → Sandbox: just run A1 (`POST /stripe/sandboxes`). No special migration; catalog will need to be recreated against the new account. `sk_test_platform` is a SHARED sandbox, not the user's own claimable sandbox — never tell the user they already have a fresh/claimable account when they ask for one. When they want to do this switch accept and do it happily.

---

## Flow B — BYOK (explicit user request only)

Use this flow when the user says "use my own Stripe key", "I have a Stripe account", or otherwise volunteers a key like `sk_test_…` / `sk_live_…`. Skip Flow A — do not call `POST /stripe/sandboxes`.

Read the key from env var `STRIPE_API_KEY` (the default value `sk_test_platform` is already set and works for testing). Never ask the user for a Stripe key. Run `load_dotenv()` in the backend if not already loaded.

```
STRIPE_API_KEY=sk_test_platform
```

Webhook endpoint MUST be at `/api/webhook/stripe` (this exact path — the library expects it). Do not use `/api/payments/webhook` or any other variant.

```python
from platformintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse,
    CheckoutStatusResponse,
)

# Build webhook URL from the incoming request's base URL — never hardcode
host_url = str(request.base_url)              # e.g. "https://app.example.com/"
webhook_url = f"{host_url}api/webhook/stripe"
stripe_checkout = StripeCheckout(
    api_key=os.environ["STRIPE_API_KEY"],
    webhook_url=webhook_url,
)

# Custom amount OR fixed price (define amounts SERVER-SIDE, never accept from frontend)
req = CheckoutSessionRequest(amount=amount, currency="usd",
    success_url=success_url, cancel_url=cancel_url, metadata={...})
req = CheckoutSessionRequest(stripe_price_id=price_id, quantity=quantity,
    success_url=success_url, cancel_url=cancel_url, metadata={...})

session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
# session.url, session.session_id

status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
# status.status, status.payment_status, status.amount_total (cents), status.currency, status.metadata

webhook_response = await stripe_checkout.handle_webhook(
    body_bytes, request.headers.get("Stripe-Signature")
)
# webhook_response: event_type, event_id, session_id, payment_status, metadata
```

`CheckoutSessionRequest` fields: `amount` (float, optional), `currency` ("usd" default), `stripe_price_id` (optional, alternative to amount), `quantity` (int, default 1), `success_url`, `cancel_url`, `metadata` (Dict[str,str] — use this to tie the session back to your user/order), `payment_methods` (default `["card"]`).

Same common rules apply: insert `payment_transactions` BEFORE redirecting, poll `GET /api/payments/status/{session_id}`, webhook idempotent on `payment_status != "paid"`. On success, update the DB first, THEN run any other follow-on actions (credit grants, fulfilment, emails) — never the other way around. Frontend sends `{package_id, origin_url}` — backend builds `success_url=f"{origin_url}/...?session_id={CHECKOUT_SESSION_ID}"` and `cancel_url`.

Define fixed packages server-side (`PACKAGES = {"starter": 19.0, "pro": 49.0, ...}`); accept only `package_id` from the request. Amounts as float (`19.0`), never int. Crypto (US-only, Dashboard toggle required): `payment_methods=["card","crypto"]` for both or `["crypto"]` for crypto-only; either way `currency="usd"`.

---

## Anti-patterns

- Never hardcode Stripe price IDs (`price_xxx`) — look up by `lookup_key`.
- Never hardcode `success_url`/`cancel_url`.
- Never write `PLATFORM_LLM_KEY` to app code, `.env`, or client.
- Never send `email`/`country`/`preview_url` in `POST /stripe/sandboxes`.
- Never provision a sandbox (`POST /stripe/sandboxes`) when the user has volunteered their own Stripe key — that's Flow B, skip Flow A entirely.
- Never ask the user for a Stripe key under Flow B — read it from `STRIPE_API_KEY` env var (the platform already injects a default).
- Never put the Flow B webhook anywhere except `/api/webhook/stripe` — the library expects this exact path. (Flow A's webhook lives at `/api/stripe/webhook`; don't mix them up.)

## Notes (remember these)

- Same code works in preview and post-deploy — no env branching, no conditional logic for environments.
- Tell the user to complete KYC before deploy; platform auto-switches sandbox keys to live keys on approval. If the user deploys with test keys first and claims later, the platform triggers an automatic redeployment with live keys; tell them to expect this.
- `onboarding_url` is also delivered via Stripe email and the Payments tab — mention these backup channels when sharing.
- FAQ routing: Stripe-side questions (sandbox claiming, KYC, payouts) → https://docs.stripe.com/sandboxes/claimable-sandboxes. The platform-side questions (Payments tab, secrets, deployment) → the Payments tab in the platform UI. Answer inline with what you know first, then point to these.
- if user wants to change their stripe sandbox, or api keys → advise against it and tell it will require major code changes.
- if user asks to add products directly on stripe, recommned addition via you. When you add them to stripe upon re-deployment by the user the products will re-sync to the stripe account.
- never ask user for prod keys in case of claimable sandbox and don't change anything in live stripe account.
- for any apis related info blocker you can websearch or see stripe documentation.
- MANDATORY in your finish summary: communicate to the user the tax mode that has been selected, what other tax modes are available, and give them an option to switch the plan later by asking the agent.

Always communicate each plan in your finish summary, in plain English (never expose SMP/OCS/automatic_tax labels). Use the wording below verbatim as your source text — but **strip the `[full]/[calc_only]/[diy]` tags before showing the user** (they're internal handles from A4):

> - Stripe manages everything including tax and compliance handling (+3.5% per transaction) — in ~80 countries ([check eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)), Stripe handles tax calculation, collection, filing, and remittance, plus fraud protection, dispute handling, and customer support. For buyers elsewhere, Stripe will alert you on registration requirements. [full]
> - Stripe calculates only (+0.5% per transaction) — Stripe charges the right tax at checkout; you file the returns yourself. [calc_only]
> - DIY — Stripe just processes the payment, no tax help. Cheapest, most work for you. [diy]

If a user sells physical products only or is in a non-SMP-supported country, do not show the [full] option.

Internal mapping (do not show to user): `full` → SMP, `calc_only` → OCS + Stripe Tax, `diy` → OCS only.

If they chose Stripe-calculates-only, also tell them to enable Stripe Tax in their Dashboard. Never expose SMP/OCS/automatic_tax to the user.
