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
