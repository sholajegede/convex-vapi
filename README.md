# convex-vapi

Sync Vapi voice AI calls into your Convex database reactively, and place outbound calls directly from Convex functions.

[![npm version](https://badge.fury.io/js/convex-vapi.svg)](https://badge.fury.io/js/convex-vapi)

<!-- START: Include on https://convex.dev/components -->

## What this does

`convex-vapi` gives your Convex app a live, queryable record of Vapi voice AI calls, kept up to date by Vapi's server-URL webhooks, plus a small set of actions for placing and inspecting calls:

- **Reactive call tracking** — every `status-update` and `end-of-call-report` webhook event updates a Convex row, so `useQuery` in your React app re-renders as a call rings, connects, and ends, complete with transcript, summary, and recording once available.
- **Place outbound calls** — call `createCall` from a Convex action to start a phone call through a Vapi assistant.
- **Non-destructive merges** — a sparser event (e.g. a mid-call status update) never overwrites richer data an earlier event already recorded (e.g. a transcript from the final report).
- **Secret-verified webhooks** — every inbound webhook is checked against Vapi's `X-Vapi-Secret` header with a constant-time comparison before anything is written.

This is a [Convex component](https://convex.dev/components): its `calls` and `webhookEvents` tables live in an isolated schema, not your app's schema, and are only reachable through the functions this component exposes.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Type Reference](#type-reference)
- [Webhook Events](#webhook-events)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Testing](#testing)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)

## Install

```sh
npm install convex-vapi
```

## Quick Start

### 1. Add the component

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexVapi from "convex-vapi/convex.config";

const app = defineApp();
app.use(convexVapi);

export default app;
```

### 2. Set environment variables

```sh
npx convex env set VAPI_API_KEY your-private-api-key
npx convex env set VAPI_WEBHOOK_SECRET whsec_...
```

`VAPI_API_KEY` is your private key from the Vapi dashboard (Settings → API Keys). `VAPI_WEBHOOK_SECRET` is a secret string you choose yourself — you'll configure the same value on the assistant in step 4.

### 3. Mount the webhook handler

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { Vapi } from "convex-vapi";

const vapi = new Vapi(components.convexVapi, {
  apiKey: process.env.VAPI_API_KEY!,
  webhookSecret: process.env.VAPI_WEBHOOK_SECRET!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/vapi",
  method: "POST",
  handler: vapi.webhookHandler,
});

export default http;
```

### 4. Configure the webhook on your assistant

Set the assistant's `serverUrl` to `https://<your-deployment>.convex.site/webhooks/vapi` and its `server.secret` to the same value as `VAPI_WEBHOOK_SECRET`, either in the Vapi dashboard or via the API:

```sh
curl -X PATCH https://api.vapi.ai/assistant/<assistant-id> \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"serverUrl": "https://<your-deployment>.convex.site/webhooks/vapi", "server": {"secret": "whsec_..."}}'
```

### 5. Initialize the client

```ts
// convex/example.ts
import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { Vapi } from "convex-vapi";
import { v } from "convex/values";

const vapi = new Vapi(components.convexVapi, {
  apiKey: process.env.VAPI_API_KEY!,
  webhookSecret: process.env.VAPI_WEBHOOK_SECRET!,
});

export const listCallsByAssistant = query({
  args: { assistantId: v.string() },
  handler: async (ctx, args) => {
    return await vapi.listCallsByAssistant(ctx, args);
  },
});
```

## Setup

The component needs no schema changes in your app — its tables (`calls`, `webhookEvents`) live entirely inside the component's own isolated schema. All you need is the webhook mounted (step 3) and secret configured (step 4), plus a `Vapi` client instance wherever you call its methods.

Assistants and phone numbers are managed entirely in the Vapi dashboard or API — this component tracks calls, not the assistants that make them.

## Usage

### Place an outbound call

```ts
export const dial = action({
  args: { assistantId: v.string(), phoneNumberId: v.string(), customerNumber: v.string() },
  handler: async (ctx, args) => {
    return await vapi.createCall(ctx, args);
  },
});
```

Returns `{ callId, status }` and immediately records the call in Convex — you don't have to wait for the first webhook to see it in a query.

### Refresh a call on demand

```ts
export const sync = action({
  args: { callId: v.string() },
  handler: async (ctx, args) => {
    await vapi.refreshCall(ctx, args);
    return null;
  },
});
```

Fetches the call directly from the Vapi API and re-records it — useful as a fallback if a webhook delivery was missed, or to pull in the transcript/recording immediately after a call ends without waiting on the webhook queue.

### Read calls reactively

```tsx
const calls = useQuery(api.example.listCallsByAssistant, { assistantId: "assistant_..." });
```

Every `status-update` and `end-of-call-report` webhook event patches a row, so this query re-renders live as a call progresses from `queued` through `ringing`, `in-progress`, and `ended` — no polling.

## API Reference

### Actions (need `ctx` from an action)

| Method | Description |
| --- | --- |
| `createCall(ctx, { assistantId, phoneNumberId, customerNumber })` | Places an outbound call via the REST API and records it. Returns `{ callId, status }`. |
| `refreshCall(ctx, { callId })` | Re-fetches a call from the Vapi API and re-records its current state, including transcript/summary/recording if the call has ended. |

### Queries (work from actions, queries, or mutations)

| Method | Description |
| --- | --- |
| `getCall(ctx, { callId })` | Fetch one call by its Vapi call id. |
| `listCallsByAssistant(ctx, { assistantId, limit? })` | Most recently updated calls for an assistant, newest first. |

### Webhook

| Property | Description |
| --- | --- |
| `webhookHandler` | An `httpAction` that verifies, deduplicates, and processes `status-update` and `end-of-call-report` webhook deliveries. Mount it at any route. |

## Type Reference

```ts
type VapiOptions = {
  apiKey: string;        // private API key from the Vapi dashboard
  webhookSecret: string; // matches the assistant's server.secret
};

type CreateCallArgs = {
  assistantId: string;
  phoneNumberId: string;
  customerNumber: string; // E.164 format, e.g. "+11231231234"
};

type Call = {
  callId: string;
  assistantId?: string;
  phoneNumberId?: string;
  customerNumber?: string;
  status: string;         // "queued" | "ringing" | "in-progress" | "forwarding" | "ended" | ...
  endedReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  cost?: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
};
```

## Webhook Events

The webhook handler processes two of Vapi's server message types (all others are recorded for idempotency but otherwise ignored — see Limitations):

- **`status-update`** — updates the call's `status` field (`queued`, `ringing`, `in-progress`, `forwarding`, `ended`, ...) as the call progresses.
- **`end-of-call-report`** — the final summary sent once a call ends; records `endedReason`, `transcript`, `summary`, `recordingUrl`, and `cost`.

Every request is checked against the `X-Vapi-Secret` header with a constant-time comparison against your configured `webhookSecret` before anything is written. Vapi does not include a per-delivery id in its webhook headers, so duplicate detection here hashes the raw request body with SHA-256 — an identical payload delivered twice is treated as a duplicate and skipped.

Calls are recorded with a merge, not a blind overwrite: fields missing from the current event (e.g. `transcript` on a mid-call `status-update`) fall back to whatever was already stored, so a later, sparser event can never blank out data an earlier, richer one recorded.

## Database Schema

```ts
calls: {
  callId: string;           // indexed: by_callId
  assistantId?: string;     // indexed: by_assistantId
  phoneNumberId?: string;
  customerNumber?: string;
  status: string;
  endedReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  cost?: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
}

webhookEvents: {
  eventId: string;   // indexed: by_eventId — SHA-256 hex of the raw payload
  eventType: string; // message.type
  callId?: string;
  payload: string;   // raw JSON body, for auditing/replay
  receivedAt: number;
}
```

This schema lives entirely inside the component's isolated namespace — it will never collide with tables in your app's own `convex/schema.ts`.

## Authentication

Vapi supports several ways to authenticate outgoing webhook requests. This component implements the original and simplest one: a shared secret you set on the assistant's `server.secret` field, which Vapi echoes back verbatim in the `X-Vapi-Secret` header on every request — verified here with a constant-time string comparison. Vapi's newer configurable-HMAC system (a separate Custom Credential resource with a selectable algorithm and signature header) is not implemented, since it requires provisioning that Credential outside of the assistant's own configuration; if you need it, verify the signature yourself before the request reaches this component's `webhookHandler`.

## Testing

```sh
npm run test
npm run typecheck
```

Tests use [`convex-test`](https://www.npmjs.com/package/convex-test) and cover `recordCall`'s merge-on-upsert behavior (confirming a sparser later event never blanks a richer earlier one), `listCallsByAssistant` scoping by assistant, and webhook idempotency via `checkAndRecordEvent`.

## Limitations

- Only `status-update` and `end-of-call-report` message types update the `calls` table. `transcript` (partial live captions), `conversation-update`, `speech-update`, `tool-calls`, and other real-time message types are accepted (and recorded in `webhookEvents` for auditing) but not persisted to `calls` — storing every partial transcript chunk would be high-volume and is better handled with your own streaming UI if you need live captions.
- Assistant and phone number management (creating, updating, or listing assistants) is out of scope — this component tracks calls, not the resources that place them.
- Live in-call control (e.g. programmatically ending an active call, or transferring it) is not implemented; only `createCall` (start) and `refreshCall` (poll) are provided.
- Rate limits are Vapi's own — this component does not implement its own rate limiting or backoff.

## Troubleshooting

**Webhook returns 401** — the `X-Vapi-Secret` header didn't match. Confirm the assistant's `server.secret` field is set to exactly the same value as `VAPI_WEBHOOK_SECRET` (a `PATCH /assistant/{id}` call, or the dashboard's assistant settings, both work).

**Webhook returns 400 "Missing X-Vapi-Secret header"** — the assistant's `serverUrl` is set but `server.secret` isn't configured, so Vapi isn't sending the header at all.

**Calls never appear in queries** — confirm the assistant's `serverUrl` points at your deployment's `.convex.site` domain (not `.convex.cloud`), and that it's reachable publicly (Convex HTTP actions are public by default, so this is usually a typo in the URL).

**Transcript/summary are missing after a call ends** — these only arrive with the `end-of-call-report` message, sent shortly after the call ends; call `refreshCall` if you need them sooner than the webhook arrives, or if a delivery was dropped.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

<!-- END: Include on https://convex.dev/components -->
