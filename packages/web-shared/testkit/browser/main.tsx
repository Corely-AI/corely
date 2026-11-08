import React from "react";
import { createRoot } from "react-dom/client";
import { SessionProviders } from "../../src/session/session-provider";
import { useSession } from "../../src/session/session-context";
import { SsoAppKeySchema } from "@corely/contracts";
import { Button } from "@corely/ui";
import "./style.css";
const query = new URLSearchParams(location.search);
const appKey = SsoAppKeySchema.parse(query.get("app") ?? "invoice");
const locale = query.get("locale") === "de" ? "de" : query.get("locale") === "vi" ? "vi" : "en";
document.documentElement.lang = locale;
let expired = false;
const fetchFn: typeof fetch = async (_input) => {
  if (query.get("state") === "booting") {
    return new Promise(() => {});
  }
  const status = expired
    ? 401
    : query.get("state") === "unauthenticated"
      ? 401
      : query.get("state") === "forbidden"
        ? 403
        : query.get("state") === "unavailable"
          ? 503
          : 200;
  return new Response(
    JSON.stringify(
      status !== 200
        ? {}
        : {
            csrfToken: "a".repeat(43),
            expiresAt: "2099-01-01T00:00:00.000Z",
            appKey,
            user: {
              userId: "synthetic-colleague",
              name: "Synthetic colleague",
              email: "colleague@example.invalid",
              memberships: [
                { tenantId: "synthetic-team", tenantName: "Synthetic team", roleId: "member" },
              ],
            },
          }
    ),
    { status, headers: { "Content-Type": "application/json" } }
  );
};
function Protected() {
  const { client } = useSession();
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">{appKey} workspace</h1>
        <p>Signed in as Synthetic colleague.</p>
        <Button
          onClick={() => {
            expired = true;
            void client.request("/invoices").catch(() => {});
          }}
        >
          Simulate expired session
        </Button>
      </section>
    </main>
  );
}
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing fixture root");
}
createRoot(root).render(
  <SessionProviders config={{ appKey, locale }} fetchFn={fetchFn} navigate={() => {}}>
    <Protected />
  </SessionProviders>
);
