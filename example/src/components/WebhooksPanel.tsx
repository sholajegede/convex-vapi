import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatTime, truncate } from "../lib/format";
import { Card, Empty } from "./ui";

export function WebhooksPanel() {
  const events = useQuery(api.example.listRecentWebhookEvents, { limit: 30 });

  return (
    <Card
      title="Webhook deliveries"
      desc="Every delivery Vapi has sent this deployment, deduped by a hash of the raw payload before anything is written — Vapi sends no per-delivery id of its own."
    >
      {events && events.length === 0 && (
        <Empty>No webhook deliveries recorded yet.</Empty>
      )}
      {events && events.length > 0 && (
        <ul className="obs-list">
          {events.map((e) => (
            <li key={e._id} className="obs-item">
              <div className="obs-top">
                <span className="mono">{e.eventType}</span>
                <span>{formatTime(e.receivedAt)}</span>
              </div>
              {e.callId && <div className="mono">{e.callId}</div>}
              <div className="obs-io">{truncate(e.payload, 260)}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
