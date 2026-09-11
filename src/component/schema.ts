import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  calls: defineTable({
    callId: v.string(), // Vapi's call id
    assistantId: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    customerNumber: v.optional(v.string()),
    status: v.string(), // "queued" | "ringing" | "in-progress" | "forwarding" | "ended" | ...
    endedReason: v.optional(v.string()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    cost: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_callId", ["callId"])
    .index("by_assistantId", ["assistantId"]),

  webhookEvents: defineTable({
    eventId: v.string(), // sha256 hex of the raw body — Vapi sends no per-delivery id
    eventType: v.string(), // message.type
    callId: v.optional(v.string()),
    payload: v.string(),
    receivedAt: v.number(),
  }).index("by_eventId", ["eventId"]),
});
