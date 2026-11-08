import React from "react";
import { Button } from "@corely/ui";
import type { BrowserSessionContext } from "./session-context";

const copy = {
  en: {
    booting: "Checking your session…",
    unauthenticated: "Sign in to continue",
    forbidden: "You do not have access to this app.",
    unavailable: "Corely is temporarily unavailable. Try again.",
    login: "Sign in",
    retry: "Try again",
  },
  de: {
    booting: "Sitzung wird geprüft…",
    unauthenticated: "Zum Fortfahren anmelden",
    forbidden: "Du hast keinen Zugriff auf diese App.",
    unavailable: "Corely ist vorübergehend nicht verfügbar. Versuche es erneut.",
    login: "Anmelden",
    retry: "Erneut versuchen",
  },
  vi: {
    booting: "Đang kiểm tra phiên đăng nhập…",
    unauthenticated: "Đăng nhập để tiếp tục",
    forbidden: "Bạn không có quyền truy cập ứng dụng này.",
    unavailable: "Corely tạm thời không khả dụng. Vui lòng thử lại.",
    login: "Đăng nhập",
    retry: "Thử lại",
  },
};
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
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section
        className="max-w-md space-y-4"
        aria-live="polite"
        aria-busy={state.status === "booting"}
      >
        <p role={state.status === "booting" ? "status" : "alert"}>{text[state.status]}</p>
        {state.status === "unauthenticated" ? (
          <Button
            className="min-h-11"
            onClick={() => {
              void value.login();
            }}
          >
            {text.login}
          </Button>
        ) : state.status !== "booting" ? (
          <Button
            className="min-h-11"
            onClick={() => {
              void value.retry();
            }}
          >
            {text.retry}
          </Button>
        ) : null}
      </section>
    </main>
  );
}
