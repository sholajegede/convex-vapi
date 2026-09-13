import { describe, expect, test } from "vitest";
import { initConvexTest } from "./setup.test.js";
import { api } from "./_generated/api.js";

describe("calls", () => {
  test("recordCall inserts then merges a sparser status-update without blanking fields", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordCall, {
      callId: "call_1",
      assistantId: "assistant_1",
      status: "ended",
      transcript: "Hello, how can I help you today?",
      summary: "Customer asked about pricing.",
    });

    let call = await t.query(api.lib.getCall, { callId: "call_1" });
    expect(call?.transcript).toBe("Hello, how can I help you today?");

    // A later, sparser event (e.g. a duplicate status-update) must not erase
    // the transcript/summary already recorded by the end-of-call-report.
    await t.mutation(api.lib.recordCall, {
      callId: "call_1",
      status: "ended",
    });

    call = await t.query(api.lib.getCall, { callId: "call_1" });
    expect(call?.status).toBe("ended");
    expect(call?.transcript).toBe("Hello, how can I help you today?");
    expect(call?.summary).toBe("Customer asked about pricing.");
  });

  test("recordCall never lets a late, out-of-order status-update regress a call away from ended", async () => {
    const t = initConvexTest();

    // The end-of-call-report arrives first and marks the call ended.
    await t.mutation(api.lib.recordCall, {
      callId: "call_2",
      assistantId: "assistant_1",
      status: "ended",
      endedReason: "customer-ended-call",
    });

    // Vapi gives no delivery ordering guarantee, so a status-update from
    // earlier in the call can still arrive after the end-of-call-report.
    // It must not regress the call's status back to an in-progress state.
    await t.mutation(api.lib.recordCall, {
      callId: "call_2",
      assistantId: "assistant_1",
      status: "in-progress",
    });

    const call = await t.query(api.lib.getCall, { callId: "call_2" });
    expect(call?.status).toBe("ended");
    expect(call?.endedReason).toBe("customer-ended-call");
  });

  test("listCallsByAssistant scopes by assistantId", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordCall, {
      callId: "call_a",
      assistantId: "assistant_a",
      status: "queued",
    });
    await t.mutation(api.lib.recordCall, {
      callId: "call_b",
      assistantId: "assistant_b",
      status: "queued",
    });

    const results = await t.query(api.lib.listCallsByAssistant, {
      assistantId: "assistant_a",
    });
    expect(results).toHaveLength(1);
    expect(results[0].callId).toBe("call_a");
  });
});

describe("dashboard queries", () => {
  test("getStats counts calls by status and webhook events", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordCall, { callId: "call_a", status: "ended" });
    await t.mutation(api.lib.recordCall, {
      callId: "call_b",
      status: "ringing",
    });
    await t.mutation(api.lib.recordCall, {
      callId: "call_c",
      status: "in-progress",
    });
    await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "hash_a",
      eventType: "status-update",
      payload: "{}",
    });

    const stats = await t.query(api.lib.getStats, {});
    expect(stats).toEqual({
      callCount: 3,
      endedCount: 1,
      liveCount: 2,
      webhookEventCount: 1,
    });
  });

  test("listRecentCalls returns calls most-recently-updated first", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.recordCall, {
      callId: "call_old",
      status: "ended",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await t.mutation(api.lib.recordCall, {
      callId: "call_new",
      status: "ended",
    });

    const recent = await t.query(api.lib.listRecentCalls, { limit: 10 });
    expect(recent.map((c) => c.callId)).toEqual(["call_new", "call_old"]);
  });

  test("listRecentWebhookEvents returns events most-recent first", async () => {
    const t = initConvexTest();

    await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "hash_old",
      eventType: "status-update",
      payload: "{}",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "hash_new",
      eventType: "end-of-call-report",
      payload: "{}",
    });

    const recent = await t.query(api.lib.listRecentWebhookEvents, {
      limit: 10,
    });
    expect(recent.map((e) => e.eventId)).toEqual(["hash_new", "hash_old"]);
  });
});

describe("webhook idempotency", () => {
  test("checkAndRecordEvent flags duplicate payload hashes", async () => {
    const t = initConvexTest();

    const first = await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "hash_1",
      eventType: "status-update",
      callId: "call_1",
      payload: "{}",
    });
    expect(first.alreadyProcessed).toBe(false);

    const second = await t.mutation(api.lib.checkAndRecordEvent, {
      eventId: "hash_1",
      eventType: "status-update",
      callId: "call_1",
      payload: "{}",
    });
    expect(second.alreadyProcessed).toBe(true);
  });
});
