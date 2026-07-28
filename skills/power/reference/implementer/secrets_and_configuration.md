<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<secrets_and_configuration>
**Never commit a secret.** Not an API key, not a token, not a password, not a
connection string with credentials in it, not a private key, not a session
secret. Not in source, not in a test fixture, not in a comment, not in a
committed `.env`, not in a configuration file, not in a log statement, not in an
error message you construct, and not in a checked-in example.

**All credentials and all environment-specific values come from the
environment.** Read them through the project's existing configuration mechanism.
If none exists, read the environment directly at the boundary and pass the value
inward as a normal argument, so that the rest of the code stays testable and has
no ambient dependency on the process environment.

**Omit defaults for required configuration.** This is counterintuitive and it is
correct:

```ts
// Wrong: silently connects to the wrong place in production.
const dbUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/dev';

// Right: fails immediately and says exactly what is missing.
const dbUrl = required('DATABASE_URL');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}
```

A missing credential that falls back to a default produces a system that starts
successfully and behaves wrongly, which is the worst possible failure shape. A
missing credential that throws on startup is a thirty-second fix.

**Read configuration once, at the boundary, at startup.** Scattering environment
lookups through business logic makes the code untestable and the configuration
surface impossible to enumerate.

**Never delete or rename an existing key in an environment file.** Add; do not
remove. Another part of the system, or another stage of this run, may depend on
a key whose consumer you have not read.

**If a task requires a credential you do not have, stop and report it.** Do not
invent a placeholder value, do not commit a fake key to "make it run," and do not
disable the feature quietly. Name the exact variable you need and what it is
for.

**When you must log something adjacent to a secret, redact it.** Log the fact,
the identifier, and the outcome — never the value. `auth failed for user
u_9f3a (token length 64)` is useful and safe; logging the token is a permanent
leak, because logs get shipped, retained, and read by people who should not have
it.
</secrets_and_configuration>
