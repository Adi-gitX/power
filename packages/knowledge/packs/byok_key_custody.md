# Custody of a customer's own API key

Under bring-your-own-key the customer's provider key is the only secret held at
rest. Everything else — repository tokens, MCP credentials — is injected
downstream by the provider and never touches our storage. That concentration is
good: there is exactly one thing to protect, so protect it properly.

## Envelope encryption, per tenant

Never store the key directly, and never encrypt every tenant's key under one
master key.

```
tenant → KMS-generated data key → AES-256-GCM(key material)
         ↓ encrypted data key stored alongside the ciphertext
```

1. Ask KMS for a data key per tenant. You get plaintext and encrypted forms.
2. Encrypt the credential with the plaintext data key using AEAD.
3. Persist the ciphertext, the nonce, and the **encrypted** data key.
4. Zero the plaintext data key.

Bind the tenant id into the AEAD additional authenticated data. Then a
ciphertext moved to another tenant's row fails to decrypt instead of silently
authenticating as the wrong customer.

## Decrypt as late as possible, hold as briefly as possible

Decrypt when constructing the provider client and let it go out of scope with
the request. Do not cache plaintext on a long-lived object, and do not put it on
anything that might be serialized — a config object that reaches a crash reporter
puts the key in a third-party system you do not control.

## Plaintext must never reach a log

Redaction after the fact is a losing game. Make the value structurally
un-loggable: wrap it in a type whose `toString`, `toJSON`, and inspection hook
all return a fixed placeholder, and unwrap only at the call site that needs it.

```ts
class Secret {
  constructor(private readonly value: string) {}
  expose(): string { return this.value; }
  toString(): string { return '[redacted]'; }
  toJSON(): string { return '[redacted]'; }
  [Symbol.for('nodejs.util.inspect.custom')](): string { return '[redacted]'; }
}
```

This survives the case redaction misses: an object logged whole by a middleware
nobody was thinking about.

## Never put the key in the sandbox

The agent's container must never see it. Sessions are created by our process
using the key; the container receives no credential. Anything the container
needs — a repository token, an MCP credential, a third-party API key — goes
through the provider's git proxy or a vault, where it is substituted at egress.

A key placed in a system prompt, a user message, or a file in the workspace is
durably persisted in the session's event history and readable through the API for
the life of that session. There is no way to un-send it.

## Validate at connect, not at first use

Make one cheap authenticated call when the customer connects. A key that is
invalid, revoked, or scoped to the wrong workspace should fail during connection,
where the customer is present and can fix it — not twenty minutes into an
autonomous run.

## Rotation and revocation

- Support replacing a key without recreating the connection. Runs already in
  flight keep using the client they were constructed with.
- On disconnect, delete the ciphertext rather than marking a row inactive. A
  soft-deleted credential is still a credential.
- Treat a provider auth error mid-run as a revocation signal: stop the run, mark
  the connection unhealthy, and tell the customer which key failed.

## What to tell the customer

State plainly what you hold, where, and how to remove it. "Your key is encrypted
with a per-workspace key and used only to run your agents; disconnecting deletes
it" is a sentence a security reviewer can check. Vagueness here reads as evasion
and is the thing that stops enterprise adoption.
