import { httpActionGeneric } from "convex/server";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

const VAPI_API_BASE = "https://api.vapi.ai";

export type VapiOptions = {
  /** A private API key from the Vapi dashboard. */
  apiKey: string;
  /**
   * The shared secret configured in the assistant's `server.secret` field.
   * Sent back by Vapi on every webhook request in the `X-Vapi-Secret` header.
   */
  webhookSecret: string;
};

export type CreateCallArgs = {
  assistantId: string;
  phoneNumberId: string;
  customerNumber: string;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sha256Hex(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function callRecordFromApiObject(call: Record<string, unknown>) {
  const customer = call.customer as Record<string, unknown> | undefined;
  return {
    callId: String(call.id),
    assistantId: (call.assistantId as string) ?? undefined,
    phoneNumberId: (call.phoneNumberId as string) ?? undefined,
    customerNumber: (customer?.number as string) ?? undefined,
    status: (call.status as string) ?? "unknown",
    endedReason: (call.endedReason as string) ?? undefined,
    startedAt: call.startedAt
      ? new Date(call.startedAt as string).getTime()
      : undefined,
    endedAt: call.endedAt
      ? new Date(call.endedAt as string).getTime()
      : undefined,
    cost: (call.cost as number) ?? undefined,
  };
}

export class Vapi {
  webhookHandler: ReturnType<typeof httpActionGeneric>;

  constructor(
    private component: ComponentApi,
    private options: VapiOptions,
  ) {
    const component_ = component;
    const webhookSecret = options.webhookSecret;

    this.webhookHandler = httpActionGeneric(async (ctx, request) => {
      const rawBody = await request.text();
      const secretHeader = request.headers.get("x-vapi-secret");

      if (!secretHeader) {
        return new Response(
          JSON.stringify({ error: "Missing X-Vapi-Secret header" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (!timingSafeEqual(secretHeader, webhookSecret)) {
        console.error("convex-vapi: webhook secret mismatch");
        return new Response(JSON.stringify({ error: "Invalid secret" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Vapi does not send a per-delivery id header, so duplicates are
      // detected by hashing the raw payload itself.
      const eventId = await sha256Hex(rawBody);

      const payload = JSON.parse(rawBody) as {
        message?: Record<string, unknown>;
      };
      const message = payload.message ?? {};
      const eventType = (message.type as string) ?? "unknown";
      const call = message.call as Record<string, unknown> | undefined;
      const callId = call?.id ? String(call.id) : undefined;

      const { alreadyProcessed } = await ctx.runMutation(
        component_.lib.checkAndRecordEvent,
        {
          eventId,
          eventType,
          callId,
          payload: rawBody,
        },
      );

      if (alreadyProcessed) {
        return new Response(
          JSON.stringify({ success: true, duplicate: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (eventType === "status-update" && call) {
        await ctx.runMutation(component_.lib.recordCall, {
          ...callRecordFromApiObject(call),
          status:
            (message.status as string) ?? (call.status as string) ?? "unknown",
        });
      } else if (eventType === "end-of-call-report" && call) {
        const artifact = message.artifact as
          | Record<string, unknown>
          | undefined;
        await ctx.runMutation(component_.lib.recordCall, {
          ...callRecordFromApiObject(call),
          status: "ended",
          endedReason: (message.endedReason as string) ?? undefined,
          transcript: (artifact?.transcript as string) ?? undefined,
          summary: (artifact?.summary as string) ?? undefined,
          recordingUrl:
            (artifact?.recordingUrl as string) ??
            ((artifact?.recording as Record<string, unknown> | undefined)
              ?.stereoUrl as string) ??
            undefined,
        });
      }
      // Other event types (transcript, conversation-update, speech-update,
      // tool-calls, etc.) are accepted and recorded in webhookEvents for
      // idempotency/auditing, but do not update the calls table — see the
      // README's Limitations section.

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async createCall(
    ctx: RunMutationCtx,
    args: CreateCallArgs,
  ): Promise<{ callId: string; status: string }> {
    const res = await fetch(`${VAPI_API_BASE}/call`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        assistantId: args.assistantId,
        phoneNumberId: args.phoneNumberId,
        customer: { number: args.customerNumber },
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to create Vapi call: ${res.status} ${await res.text()}`,
      );
    }
    const json = (await res.json()) as Record<string, unknown>;

    await ctx.runMutation(
      this.component.lib.recordCall,
      callRecordFromApiObject(json),
    );

    return {
      callId: String(json.id),
      status: (json.status as string) ?? "queued",
    };
  }

  /** Fetches the latest call state directly from the Vapi API and re-records it. */
  async refreshCall(
    ctx: RunMutationCtx,
    args: { callId: string },
  ): Promise<void> {
    const res = await fetch(`${VAPI_API_BASE}/call/${args.callId}`, {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch Vapi call: ${res.status} ${await res.text()}`,
      );
    }
    const json = (await res.json()) as Record<string, unknown>;
    const artifact = json.artifact as Record<string, unknown> | undefined;

    await ctx.runMutation(this.component.lib.recordCall, {
      ...callRecordFromApiObject(json),
      transcript: (artifact?.transcript as string) ?? undefined,
      summary: (artifact?.summary as string) ?? undefined,
      recordingUrl: (artifact?.recordingUrl as string) ?? undefined,
    });
  }

  async getCall(ctx: RunQueryCtx, args: { callId: string }) {
    return await ctx.runQuery(this.component.lib.getCall, args);
  }

  async listCallsByAssistant(
    ctx: RunQueryCtx,
    args: { assistantId: string; limit?: number },
  ) {
    return await ctx.runQuery(this.component.lib.listCallsByAssistant, args);
  }

  async getStats(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.lib.getStats, {});
  }

  async listRecentCalls(ctx: RunQueryCtx, args: { limit?: number } = {}) {
    return await ctx.runQuery(this.component.lib.listRecentCalls, args);
  }

  async listRecentWebhookEvents(
    ctx: RunQueryCtx,
    args: { limit?: number } = {},
  ) {
    return await ctx.runQuery(this.component.lib.listRecentWebhookEvents, args);
  }
}

type RunQueryCtx = {
  runQuery: GenericActionCtx<GenericDataModel>["runQuery"];
};

// createCall and refreshCall only ever call ctx.runMutation — never
// runQuery, runAction, the scheduler, or storage. Typing them against this
// minimal structural type instead of the full GenericActionCtx<GenericDataModel>
// means they accept any real app's ActionCtx, whose DataModel is a concrete
// set of tables (not assignable to the generic GenericDataModel once an app
// defines any tables of its own).
type RunMutationCtx = {
  runMutation: GenericActionCtx<GenericDataModel>["runMutation"];
};
