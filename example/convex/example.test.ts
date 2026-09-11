import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const componentModules = import.meta.glob("../../src/component/**/*.ts");

function initConvexTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("convexVapi", schema, componentModules);
  return t;
}

test("getCall returns null for unknown call", async () => {
  const t = initConvexTest();
  const result = await t.query(api.example.getCall, {
    callId: "unknown_call",
  });
  expect(result).toBe(null);
});

test("listCallsByAssistant returns empty array for unknown assistant", async () => {
  const t = initConvexTest();
  const result = await t.query(api.example.listCallsByAssistant, {
    assistantId: "assistant_unknown",
  });
  expect(result).toEqual([]);
});
