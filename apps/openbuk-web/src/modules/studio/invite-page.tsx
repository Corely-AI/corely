import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AcceptPilotWorkspaceInviteOutput } from "@corely/contracts";
import { api, auth, json, storage } from "../../shared/api";
import { Logo, ErrorMessage } from "../../shared/ui";
import { LanguageSwitch, useLanguage } from "../../shared/i18n";

export default function InvitePage() {
  const { t } = useLanguage();
  const location = useLocation();
  const [savedToken] = useState(() => sessionStorage.getItem("openbuk:invite") || "");
  const token = location.hash.slice(1) || savedToken;
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [joined, setJoined] = useState(false);
  useEffect(() => {
    setJoined(false);
    setError(false);
    if (token) {
      sessionStorage.setItem("openbuk:invite", token);
    }
    void auth.loadStoredTokens().then(() => setSignedIn(Boolean(auth.getAccessToken())));
  }, [token]);
  async function accept() {
    setPending(true);
    setError(false);
    try {
      // Omit the selector for this account-level request without changing the
      // saved workspace unless acceptance and the tenant switch succeed.
      const result = await api.request<AcceptPilotWorkspaceInviteOutput>(
        "/workspaces/pilot-setup/invites/accept",
        json("POST", { token }),
        { workspaceScope: "none" }
      );
      await auth.switchTenant(result.tenantId);
      await storage.setActiveWorkspaceId(result.workspaceId);
      sessionStorage.removeItem("openbuk:invite");
      window.history.replaceState(null, "", "/invite");
      setJoined(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="wrap">
        <Logo />
        <LanguageSwitch />
      </header>
      <main className="auth-card">
        <h1>{t(joined ? "staffJoined" : "joinStudio")}</h1>
        <p>{t(joined ? "staffAccess" : "acceptHelp")}</p>
        {error || (!joined && !/^[a-f0-9]{64}$/.test(token)) ? (
          <ErrorMessage message="inviteError" />
        ) : null}
        {joined ? (
          <Link className="button" to="/app">
            {t("studio")}
          </Link>
        ) : signedIn ? (
          <button
            className="button"
            disabled={pending || !/^[a-f0-9]{64}$/.test(token)}
            onClick={() => void accept()}
          >
            {t(pending ? "saving" : "acceptInvite")}
          </button>
        ) : (
          <>
            <Link className="button" to="/login">
              {t("login")}
            </Link>{" "}
            <Link to="/signup">{t("signup")}</Link>
          </>
        )}
        {!joined ? (
          <Link
            className="text-button"
            to="/app"
            onClick={() => sessionStorage.removeItem("openbuk:invite")}
          >
            {t("dismissInvite")}
          </Link>
        ) : null}
      </main>
    </div>
  );
}
