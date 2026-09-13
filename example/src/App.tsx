import { useState } from "react";
import { Header, type Tab } from "./components/Header";
import { TopBanner } from "./components/TopBanner";
import { CallsPanel } from "./components/CallsPanel";
import { WebhooksPanel } from "./components/WebhooksPanel";
import { History } from "./components/History";
import { Console } from "./components/Console";
import "./theme.css";

export default function App() {
  const [tab, setTab] = useState<Tab>("calls");

  return (
    <div className="shell">
      <div className="main">
        <Header tab={tab} onTab={setTab} />
        <TopBanner />
        {tab === "calls" && <CallsPanel />}
        {tab === "webhooks" && <WebhooksPanel />}
        {tab === "history" && <History />}
      </div>
      <Console />
    </div>
  );
}
