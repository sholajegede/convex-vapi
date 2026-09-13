import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

const callValidator = v.object({
  _id: v.id("calls"),
  _creationTime: v.number(),
  callId: v.string(),
  assistantId: v.optional(v.string()),
  phoneNumberId: v.optional(v.string()),
  customerNumber: v.optional(v.string()),
  status: v.string(),
  endedReason: v.optional(v.string()),
  transcript: v.optional(v.string()),
  summary: v.optional(v.string()),
  recordingUrl: v.optional(v.string()),
  cost: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getCall = query({
  args: { callId: v.string() },
  returns: v.union(v.null(), callValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_callId", (q) => q.eq("callId", args.callId))
      .first();
  },
});

export const listCallsByAssistant = query({
  args: { assistantId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(callValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_assistantId", (q) => q.eq("assistantId", args.assistantId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const recordCall = mutation({
  args: {
    callId: v.string(),
    assistantId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    customerNumber: v.optional(v.string()),
    status: v.string(),
    endedReason: v.optional(v.string()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    cost: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  },
  returns: v.id("calls"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("calls")
      .withIndex("by_callId", (q) => q.eq("callId", args.callId))
      .first();

    if (existing) {
      // Merge rather than blanket-overwrite: a later, sparser event (e.g. a
      // status-update with no transcript yet) must never erase fields an
      // earlier, richer event (e.g. end-of-call-report) already recorded.
      //
      // status is a special case: Vapi's webhook deliveries carry no
      // timestamp or sequence number, and delivery order is never
      // guaranteed by any webhook provider, so a status-update that
      // arrives late could otherwise regress a call backward (e.g. from
      // "ended" back to "ringing"). "ended" is the one status Vapi never
      // revises once sent, so once we've recorded it, later events are
      // treated as stragglers and can't downgrade it back.
      const status =
        existing.status === "ended" ? existing.status : args.status;
      const merged = {
        callId: args.callId,
        assistantId: args.assistantId ?? existing.assistantId,
        phoneNumberId: args.phoneNumberId ?? existing.phoneNumberId,
        customerNumber: args.customerNumber ?? existing.customerNumber,
        status,
        endedReason: args.endedReason ?? existing.endedReason,
        transcript: args.transcript ?? existing.transcript,
        summary: args.summary ?? existing.summary,
        recordingUrl: args.recordingUrl ?? existing.recordingUrl,
        cost: args.cost ?? existing.cost,
        startedAt: args.startedAt ?? existing.startedAt,
        endedAt: args.endedAt ?? existing.endedAt,
      };
      await ctx.db.patch(existing._id, { ...merged, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("calls", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const checkAndRecordEvent = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    callId: v.optional(v.string()),
    payload: v.string(),
  },
  returns: v.object({ alreadyProcessed: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) {
      return { alreadyProcessed: true };
    }
    await ctx.db.insert("webhookEvents", { ...args, receivedAt: Date.now() });
    return { alreadyProcessed: false };
  },
});

// ─── Dashboard queries ──────────────────────────────────────────────────────
// These do full, un-indexed scans across every call/event the component has
// ever recorded, on purpose — they power a demo's stats bar and activity
// history, not high-volume production use.

export const getStats = query({
  args: {},
  returns: v.object({
    callCount: v.number(),
    endedCount: v.number(),
    liveCount: v.number(),
    webhookEventCount: v.number(),
  }),
  handler: async (ctx) => {
    const [calls, webhookEvents] = await Promise.all([
      ctx.db.query("calls").collect(),
      ctx.db.query("webhookEvents").collect(),
    ]);
    const live = (status: string) =>
      status === "queued" || status === "ringing" || status === "in-progress";
    return {
      callCount: calls.length,
      endedCount: calls.filter((c) => c.status === "ended").length,
      liveCount: calls.filter((c) => live(c.status)).length,
      webhookEventCount: webhookEvents.length,
    };
  },
});

export const listRecentCalls = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(callValidator),
  handler: async (ctx, args) => {
    const calls = await ctx.db.query("calls").collect();
    return calls
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, args.limit ?? 20);
  },
});

export const listRecentWebhookEvents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("webhookEvents"),
      _creationTime: v.number(),
      eventId: v.string(),
      eventType: v.string(),
      callId: v.optional(v.string()),
      payload: v.string(),
      receivedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const events = await ctx.db.query("webhookEvents").collect();
    return events
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, args.limit ?? 20);
  },
});
