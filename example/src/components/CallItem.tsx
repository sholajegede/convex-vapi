import { useState } from "react";
import { formatDuration, relativeTime, statusTone } from "../lib/format";
import { Badge, StatusDot } from "./ui";

export type CallRecord = {
  _id: string;
  callId: string;
  assistantId?: string;
  phoneNumberId?: string;
  customerNumber?: string;
  status: string;
  endedReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  cost?: number;
  startedAt?: number;
  endedAt?: number;
  updatedAt: number;
};

function parseTranscript(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(AI|Assistant|User|Customer):\s*(.*)$/i);
      if (!match) return { speaker: "", text: line };
      return { speaker: match[1], text: match[2] };
    });
}

export function CallItem(props: { call: CallRecord }) {
  const { call } = props;
  const [expanded, setExpanded] = useState(false);
  const duration = formatDuration(call.startedAt, call.endedAt);

  return (
    <li className="call-item">
      <div className="call-top">
        <div className="call-top-left">
          <StatusDot status={call.status} />
          <span className="call-id">{call.callId}</span>
        </div>
        <div className="call-badges">
          {call.cost !== undefined && (
            <span className="mono">${call.cost.toFixed(3)}</span>
          )}
        </div>
      </div>
      <div className="call-meta">
        <Badge tone={statusTone(call.status)}>{call.status}</Badge>
        {duration && <span>{duration}</span>}
        <span>·</span>
        <span>updated {relativeTime(call.updatedAt)}</span>
      </div>
      {call.summary && <p className="call-summary">{call.summary}</p>}
      {call.transcript && (
        <div className="call-badges" style={{ marginTop: "0.5rem" }}>
          <button
            className="btn secondary"
            style={{ padding: "0.3rem 0.7rem", fontSize: "0.76rem" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide transcript" : "Show transcript"}
          </button>
        </div>
      )}
      {expanded && call.transcript && (
        <div className="call-transcript">
          {parseTranscript(call.transcript).map((line, i) => (
            <div
              key={i}
              className={`bubble ${/^(user|customer)$/i.test(line.speaker) ? "user" : "ai"}`}
            >
              {line.speaker && <b>{line.speaker}</b>}
              {line.text}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
