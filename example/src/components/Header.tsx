import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type Tab = "calls" | "webhooks" | "history";

function FlowDiagram() {
  return (
    <div>
      <div
        className="flow"
        aria-label="your app talks to Convex, which talks to Vapi over REST and webhooks, and mirrors call state back reactively"
      >
        <span className="flow-node">your app</span>
        <span className="flow-arrow">⇄</span>
        <span className="flow-node hub">Convex</span>
        <span className="flow-arrow">⇄</span>
        <span className="flow-node accent">Vapi</span>
      </div>
      <p className="flow-caption">
        createCall runs as a Convex action that calls Vapi's REST API and
        records the result immediately — Vapi's own webhooks call back into
        Convex as the call progresses, merging status, transcript, summary, and
        cost into a reactive table your app never has to poll.
      </p>
    </div>
  );
}

export function Header(props: { tab: Tab; onTab: (t: Tab) => void }) {
  const stats = useQuery(api.example.getStats);

  return (
    <div className="hero-frame">
      <div className="hero-stats">
        <span>
          <strong>{stats?.callCount ?? "…"}</strong> calls
        </span>
        <span className="dot">·</span>
        <span>
          <strong>{stats?.liveCount ?? "…"}</strong> live
        </span>
        <span className="dot">·</span>
        <span>
          <strong>{stats?.endedCount ?? "…"}</strong> ended
        </span>
        <span className="dot">·</span>
        <span>
          <strong>{stats?.webhookEventCount ?? "…"}</strong> webhook deliveries
        </span>
      </div>
      <div className="hero-divider" />
      <div className="hero-main">
        <div className="wordmark">
          <span className="logo-mark">V</span>
          convex-vapi
        </div>
        <h1 className="hero-title">
          Sync <span className="hl">Vapi</span> calls into Convex, reactively
        </h1>
        <p className="hero-sub">
          Place outbound voice AI calls from a Convex action and watch status,
          transcript, summary, and cost reconcile live as Vapi's webhooks arrive
          — without a straggling delivery ever regressing a call that's already
          ended.
        </p>
        <FlowDiagram />
      </div>
      <nav className="tabs">
        <button
          className={`tab${props.tab === "calls" ? " active" : ""}`}
          onClick={() => props.onTab("calls")}
        >
          Calls
        </button>
        <button
          className={`tab${props.tab === "webhooks" ? " active" : ""}`}
          onClick={() => props.onTab("webhooks")}
        >
          Webhooks
        </button>
        <button
          className={`tab${props.tab === "history" ? " active" : ""}`}
          onClick={() => props.onTab("history")}
        >
          History
        </button>
      </nav>
    </div>
  );
}
