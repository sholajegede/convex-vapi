import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import "./App.css";

export default function App() {
  const [assistantId, setAssistantId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const createCall = useAction(api.example.createCall);
  const calls = useQuery(
    api.example.listCallsByAssistant,
    assistantId ? { assistantId } : "skip",
  );

  async function place() {
    const result = await createCall({ assistantId, phoneNumberId, customerNumber });
    setActiveCallId(result.callId);
  }

  return (
    <main className="app">
      <h1>convex-vapi</h1>
      <p>
        Sync Vapi voice AI calls into Convex reactively, and place outbound
        calls from Convex functions.
      </p>

      <label>
        Assistant ID
        <input
          value={assistantId}
          onChange={(e) => setAssistantId(e.target.value)}
          placeholder="assistant_..."
        />
      </label>

      <label>
        Phone Number ID
        <input
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="phone_..."
        />
      </label>

      <label>
        Customer number
        <input
          value={customerNumber}
          onChange={(e) => setCustomerNumber(e.target.value)}
          placeholder="+11231231234"
        />
      </label>

      <button onClick={place} disabled={!assistantId || !phoneNumberId || !customerNumber}>
        Place call
      </button>

      {activeCallId && (
        <p>
          Started call <code>{activeCallId}</code>
        </p>
      )}

      {calls && calls.length > 0 && (
        <ul>
          {calls.map((call) => (
            <li key={call._id}>
              {call.callId} — <strong>{call.status}</strong>
              {call.summary ? `: ${call.summary}` : ""}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
