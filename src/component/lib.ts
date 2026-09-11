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
      const merged = {
        callId: args.callId,
        assistantId: args.assistantId ?? existing.assistantId,
        phoneNumberId: args.phoneNumberId ?? existing.phoneNumberId,
        customerNumber: args.customerNumber ?? existing.customerNumber,
        status: args.status,
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

    return await ctx.db.insert("calls", { ...args, createdAt: now, updatedAt: now });
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
