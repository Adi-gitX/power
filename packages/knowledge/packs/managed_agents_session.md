# Driving a Managed Agents session

Four client-side mistakes account for most broken integrations. Each looks
correct in a demo and fails under real conditions.

## 1. Create the agent once, not per run

An agent is a persisted, versioned object. Create it in setup, store the id, and
reference it from every session.

```ts
// setup, run once
const agent = await client.beta.agents.create({ name, model, system, tools });
saveConfig({ agentId: agent.id, agentVersion: agent.version });

// request path, every run
const session = await client.beta.sessions.create({
  agent: { type: 'agent', id: config.agentId, version: config.agentVersion },
  environment_id: config.environmentId,
});
```

Calling `agents.create` per run accumulates orphaned agents, pays create latency
on every invocation, and defeats the versioning that lets a bad prompt be rolled
back without disturbing in-flight sessions.

`model`, `system`, and `tools` live on the **agent**, never on the session. A
session takes a pointer.

## 2. Open the stream before sending the kickoff

The stream only delivers events emitted after it opens. Send first and the early
events arrive as one buffered batch, or not at all.

```ts
const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, { events: [kickoff] });
for await (const event of stream) { /* … */ }
```

Better still, pass the kickoff in `initial_events` on create — one round trip,
and the session comes back already `running`. Note it then never passes through
`idle`, so a client waiting for an idle→running edge to know work began will
wait forever. Check `status` on the create response instead.

## 3. SSE has no replay — reconnect with consolidation

If the connection drops, everything emitted during the gap is gone from the
stream. On every connect: open the stream first (it starts buffering), then read
history, then tail live, de-duplicating on event id.

```ts
const seen = new Set<string>();
const stream = await client.beta.sessions.events.stream(sessionId);

for await (const event of client.beta.sessions.events.list(sessionId)) {
  seen.add(event.id);
  handle(event);
}
for await (const event of stream) {
  if (seen.has(event.id)) continue;
  seen.add(event.id);
  handle(event);
}
```

This matters most when a tool call is pending: the client disconnects, the
session idles waiting for a result that will never arrive, and the run deadlocks.

## 4. Idle is not terminal

A session idles between parallel tool calls and whenever it is waiting on you.
Breaking on `session.status_idle` alone ends the loop mid-run.

```ts
if (event.type === 'session.status_terminated') break;
if (event.type === 'session.status_idle') {
  if (event.stop_reason.type === 'requires_action') continue; // it is waiting on us
  break; // end_turn or retries_exhausted
}
```

## Custom tool round-trip

When the agent calls a client-side tool, the session goes idle until you answer.
Echo `session_thread_id` when present so a subagent's call is routed back to the
right thread.

```ts
if (event.type === 'agent.custom_tool_use' && event.name === 'run_gate') {
  const result = await evaluateGate(event.input.stage);
  await client.beta.sessions.events.send(sessionId, {
    events: [{
      type: 'user.custom_tool_result',
      custom_tool_use_id: event.id,
      ...(event.session_thread_id ? { session_thread_id: event.session_thread_id } : {}),
      content: [{ type: 'text', text: JSON.stringify(result) }],
    }],
  });
}
```

Executing a tool host-side is also the security boundary: the credential stays
in your process and never enters the sandbox.

## Cleanup races

The stream reports idle slightly before the queryable status catches up, so
archiving immediately after the idle event intermittently returns 400. Poll
until `status !== 'running'` first.

## Beta header

Every Managed Agents call needs `managed-agents-2026-04-01`. The SDK adds it for
`client.beta.{agents,environments,sessions,memory_stores,vaults}.*`. The one
exception is session-scoped file listing, which is a Files endpoint taking a
Managed Agents parameter and needs both headers.
