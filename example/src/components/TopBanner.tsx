export function TopBanner() {
  return (
    <div className="banner">
      This example calls the real Vapi API using <code>VAPI_API_KEY</code> (set
      via <code>npx convex env set</code>), and receives live webhook deliveries
      at <code>/webhooks/vapi</code>. Placing a call below dials out for real —
      use a test assistant and a number you don't mind spending call minutes on.
    </div>
  );
}
