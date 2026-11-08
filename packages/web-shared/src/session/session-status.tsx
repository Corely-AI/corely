import React from "react";
import { Button } from "@corely/ui";
import type { BrowserSessionContext } from "./session-context";

const copy = {
  en: {
    signingOut: "Signing out of Corely…",
    logoutFailed:
      "Sign-out could not be confirmed. Your private data is hidden. Try signing out again.",
    migrationBlocked:
      "Old offline work needs recovery in the previous account before this origin can migrate. Close other Corely tabs and contact your administrator.",
    logout: "Retry sign out",
    booting: "Checking your session…",
    unauthenticated: "Sign in to continue",
    forbidden: "You do not have access to this app.",
    unavailable: "Corely is temporarily unavailable. Try again.",
    login: "Sign in",
    retry: "Try again",
  },
  de: {
    signingOut: "Abmeldung von Corely…",
    logoutFailed:
      "Die Abmeldung konnte nicht bestätigt werden. Private Daten sind ausgeblendet. Bitte erneut abmelden.",
    migrationBlocked:
      "Alte Offline-Aufträge müssen im bisherigen Konto wiederhergestellt werden. Schließe andere Corely-Tabs und kontaktiere deine Administration.",
    logout: "Abmeldung wiederholen",
    booting: "Sitzung wird geprüft…",
    unauthenticated: "Zum Fortfahren anmelden",
    forbidden: "Du hast keinen Zugriff auf diese App.",
    unavailable: "Corely ist vorübergehend nicht verfügbar. Versuche es erneut.",
    login: "Anmelden",
    retry: "Erneut versuchen",
  },
  vi: {
    signingOut: "Đang đăng xuất khỏi Corely…",
    logoutFailed:
      "Chưa thể xác nhận đăng xuất. Dữ liệu riêng tư đã được ẩn. Hãy thử đăng xuất lại.",
    migrationBlocked:
      "Cần khôi phục công việc ngoại tuyến trong tài khoản cũ trước khi chuyển đổi. Đóng các thẻ Corely khác và liên hệ quản trị viên.",
    logout: "Thử đăng xuất lại",
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
