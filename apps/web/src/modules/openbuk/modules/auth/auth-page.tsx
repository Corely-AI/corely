import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, json } from "../../shared/api";
import { brand } from "../../shared/brand";
import { Logo, Field, ErrorMessage } from "../../shared/ui";
import { LanguageSwitch, useLanguage } from "../../shared/i18n";
export default function AuthPage({ mode }: { mode: "login" | "signup" | "reset" }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    try {
      if (mode === "reset") {
        const r = await fetch(
          `${brand.apiUrl}/auth/password-reset/request`,
          json("POST", { email })
        );
        if (!r.ok) {
          throw new Error();
        }
        setSent(true);
      } else {
        if (mode === "signup") {
          await auth.signup({
            email,
            password,
            userName: String(data.get("name")),
            tenantName: String(data.get("studioName")),
          });
        } else {
          await auth.signin({ email, password });
        }
        navigate(sessionStorage.getItem("openbuk:invite") ? "/invite" : "/app");
      }
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
        <p className="eyebrow">{t("promise")}</p>
        <h1>{t(mode === "signup" ? "signup" : mode === "reset" ? "reset" : "welcome")}</h1>
        <form onSubmit={(e) => void submit(e)}>
          {mode === "signup" ? (
            <>
              <Field label={t("name")}>
                <input name="name" autoComplete="name" required />
              </Field>
              <Field label={t("studioName")}>
                <input name="studioName" required />
              </Field>
            </>
          ) : null}
          <Field label={t("email")}>
            <input name="email" type="email" autoComplete="email" required />
          </Field>
          {mode !== "reset" ? (
            <Field label={t("password")}>
              <input
                name="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </Field>
          ) : null}
          {error ? (
            <ErrorMessage message={mode === "signup" ? "signupError" : "loginError"} />
          ) : null}
          {sent ? <p role="status">{t("resetSent")}</p> : null}
          <button className="button full" disabled={pending}>
            {pending
              ? t("loading")
              : t(mode === "signup" ? "start" : mode === "reset" ? "reset" : "login")}
          </button>
        </form>
        <div className="auth-links">
          <Link to={mode === "signup" ? "/login" : "/signup"}>
            {t(mode === "signup" ? "login" : "signup")}
          </Link>
          <Link to="/forgot-password">{t("forgot")}</Link>
        </div>
      </main>
    </div>
  );
}
