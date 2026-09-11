/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      checkAndRecordEvent: FunctionReference<
        "mutation",
        "internal",
        { callId?: string; eventId: string; eventType: string; payload: string },
        { alreadyProcessed: boolean },
        Name
      >;
      getCall: FunctionReference<
        "query",
        "internal",
        { callId: string },
        null | {
          _creationTime: number;
          _id: string;
          assistantId?: string;
          callId: string;
          cost?: number;
          createdAt: number;
          customerNumber?: string;
          endedAt?: number;
          endedReason?: string;
          phoneNumberId?: string;
          recordingUrl?: string;
          startedAt?: number;
          status: string;
          summary?: string;
          transcript?: string;
          updatedAt: number;
        },
        Name
      >;
      listCallsByAssistant: FunctionReference<
        "query",
        "internal",
        { assistantId: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          assistantId?: string;
          callId: string;
          cost?: number;
          createdAt: number;
          customerNumber?: string;
          endedAt?: number;
          endedReason?: string;
          phoneNumberId?: string;
          recordingUrl?: string;
          startedAt?: number;
          status: string;
          summary?: string;
          transcript?: string;
          updatedAt: number;
        }>,
        Name
      >;
      recordCall: FunctionReference<
        "mutation",
        "internal",
        {
          assistantId?: string;
          callId: string;
          cost?: number;
          customerNumber?: string;
          endedAt?: number;
          endedReason?: string;
          phoneNumberId?: string;
          recordingUrl?: string;
          startedAt?: number;
          status: string;
          summary?: string;
          transcript?: string;
        },
        string,
        Name
      >;
    };
  };
