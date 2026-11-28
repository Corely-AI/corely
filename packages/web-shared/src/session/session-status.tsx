import messages from "./locales/session-status.json";
import React from "react";
import { Button } from "@corely/ui";
import type { BrowserSessionContext } from "./session-context";

const copy = messages;
export function SessionStatus({
  value,
  locale = "en",
}: {
  value: BrowserSessionContext;
  locale?: keyof typeof copy;
}) {
  const { state } = value;
  if (state.status === "authenticated") {
    return null;
  }
  const text = copy[locale];
  const busy = state.status === "booting" || state.status === "signingOut";
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-md space-y-4" aria-live="polite" aria-busy={busy}>
        <p role={busy ? "status" : "alert"}>{text[state.status]}</p>
        {state.status === "unauthenticated" ? (
          <Button
            className="min-h-11"
            onClick={() => {
              void value.login();
            }}
          >
            {text.login}
          </Button>
        ) : !busy ? (
          <Button
            className="min-h-11"
            onClick={() => {
              void (state.status === "logoutFailed" ? value.logout() : value.retry());
            }}
          >
            {state.status === "logoutFailed" ? text.logout : text.retry}
          </Button>
        ) : null}
      </section>
    </main>
  );
}
