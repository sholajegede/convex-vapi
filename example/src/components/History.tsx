import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Empty } from "./ui";
import { CallItem } from "./CallItem";

export function History() {
  const calls = useQuery(api.example.listRecentCalls, { limit: 20 });

  return (
    <Card
      title="Recent calls"
      desc="The most recently updated calls across every assistant this deployment has seen."
    >
      {calls && calls.length === 0 && <Empty>Nothing recorded yet.</Empty>}
      {calls && calls.length > 0 && (
        <ul className="call-list">
          {calls.map((call) => (
            <CallItem key={call._id} call={call} />
          ))}
        </ul>
      )}
    </Card>
  );
}
