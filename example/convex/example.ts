import { query, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { Vapi } from "../../src/client/index.js";
import { v } from "convex/values";

const vapi = new Vapi(components.convexVapi, {
  apiKey: process.env.VAPI_API_KEY!,
  webhookSecret: process.env.VAPI_WEBHOOK_SECRET!,
});

export const createCall = action({
  args: {
    assistantId: v.string(),
    phoneNumberId: v.string(),
    customerNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return await vapi.createCall(ctx, args);
  },
});

export const refreshCall = action({
  args: { callId: v.string() },
  handler: async (ctx, args) => {
    await vapi.refreshCall(ctx, args);
    return null;
  },
});

export const getCall = query({
  args: { callId: v.string() },
  handler: async (ctx, args) => {
    return await vapi.getCall(ctx, args);
  },
});

export const listCallsByAssistant = query({
  args: { assistantId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await vapi.listCallsByAssistant(ctx, args);
  },
});
