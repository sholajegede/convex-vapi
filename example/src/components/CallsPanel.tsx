import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { withLog } from "../lib/logStore";
import { Card, Field, TextInput, Button, Empty } from "./ui";
import { CallItem } from "./CallItem";

export function CallsPanel() {
  const [assistantId, setAssistantId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const createCall = useAction(api.example.createCall);
  const calls = useQuery(
    api.example.listCallsByAssistant,
    assistantId ? { assistantId } : "skip",
  );

  async function submit() {
    if (!assistantId || !phoneNumberId || !customerNumber) return;
    const result = await withLog("createCall", () =>
      createCall({ assistantId, phoneNumberId, customerNumber }),
    );
    setActiveCallId(result.callId);
  }

  return (
    <>
      <Card
        title="Place a call"
        desc="Posts to Vapi's /call endpoint via createCall and records the result immediately — no need to wait for the webhook to know a call started."
      >
        <Field label="Assistant ID">
          <TextInput
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            placeholder="assistant_..."
          />
        </Field>
        <Field label="Phone Number ID">
          <TextInput
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="phone_..."
          />
        </Field>
        <Field label="Customer number">
          <TextInput
            value={customerNumber}
            onChange={(e) => setCustomerNumber(e.target.value)}
            placeholder="+15551234567"
          />
        </Field>
        <Button
          onClick={submit}
          disabled={!assistantId || !phoneNumberId || !customerNumber}
        >
          Place call
        </Button>
        {activeCallId && (
          <p className="empty">
            Started <span className="mono">{activeCallId}</span>
          </p>
        )}
      </Card>

      <Card
        title="Calls"
        desc="Live for this assistant — updates the instant a webhook lands."
      >
        {!assistantId && (
          <Empty>Enter an assistant ID above to see its calls here.</Empty>
        )}
        {assistantId && calls && calls.length === 0 && (
          <Empty>No calls yet for this assistant.</Empty>
        )}
        {calls && calls.length > 0 && (
          <ul className="call-list">
            {calls.map((call) => (
              <CallItem key={call._id} call={call} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
