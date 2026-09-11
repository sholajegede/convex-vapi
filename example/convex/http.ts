import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { Vapi } from "../../src/client/index.js";

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
