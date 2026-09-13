export function formatTime(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** mm:ss (or h:mm:ss for long calls) between two epoch-ms timestamps. */
export function formatDuration(
  startedAt?: number,
  endedAt?: number,
): string | undefined {
  if (startedAt === undefined || endedAt === undefined) return undefined;
  const totalSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Which of the four status-dot / badge tones a Vapi call status maps to. */
export function statusTone(
  status: string,
): "pending" | "good" | "bad" | "neutral" {
  if (status === "ended") return "good";
  if (status === "failed") return "bad";
  if (status === "queued" || status === "ringing" || status === "in-progress")
    return "pending";
  return "neutral";
}
