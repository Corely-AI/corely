import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Input, Logo } from "@corely/ui/auth-primitives";
import {
  FocusedObservationSchema,
  focusedRequestEvent,
  focusedOutcome,
  SsoContextSchema,
  SsoHandleSchema,
  SsoRedirectSchema,
  type SsoContext,
} from "@corely/contracts/identity/sso";
import { loginCopy, type LoginLocale } from "./login-copy";

type Failure = "unavailable" | "invalid" | "expired" | "limit" | "conflict";
class LoginFailure extends Error {
  constructor(readonly kind: Failure) {
    super(kind);
  }
}
async function request(path: string, body?: object, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const diagnosticId = crypto.randomUUID();
  let observed = false;
  const observe = (outcome: ReturnType<typeof focusedOutcome>) => {
    if (observed) {
      return;
    }
    observed = true;
    const event = FocusedObservationSchema.parse({
      surface: "login",
      layer: "browser",
      event: focusedRequestEvent(path),
      outcome,
      requestId: diagnosticId,
    });
    try {
      console.info("corely.focused", event);
    } catch {
      /* Diagnostics cannot interrupt sign-in. */
    }
  };
  const abort = () => controller.abort();
  const timeout = window.setTimeout(abort, 15_000);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) {
    controller.abort();
  }
  try {
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "X-Request-Id": diagnosticId,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    observe(focusedOutcome(response.status));
    if (!response.ok) {
      throw new LoginFailure(
        response.status === 401
          ? "invalid"
          : response.status === 429
            ? "limit"
            : response.status === 409
              ? "conflict"
              : response.status >= 500
                ? "unavailable"
                : "expired"
      );
    }
    const result: unknown = await response.json();
    return result;
  } catch (error) {
    observe(signal?.aborted ? "aborted" : "unavailable");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
const appNames = { "app-center": "App Center", invoice: "Invoice", hr: "HR" } as const;

export function LoginPage() {
  const [locale, setLocale] = useState<LoginLocale>(() =>
    navigator.language.startsWith("de") ? "de" : navigator.language.startsWith("vi") ? "vi" : "en"
  );
  const copy = loginCopy[locale];
  const [context, setContext] = useState<SsoContext | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [mode, setMode] = useState<"code" | "password">("code");
  const [codeSent, setCodeSent] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const requestId = new URLSearchParams(window.location.search).get("request");
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const controller = new AbortController();
    setFailure(null);
    setContext(null);
    if (!SsoHandleSchema.safeParse(requestId).success) {
      setFailure("expired");
      return;
    }
    void request(
      `/sso/context?request=${encodeURIComponent(requestId ?? "")}`,
      undefined,
      controller.signal
    )
      .then((result) => setContext(SsoContextSchema.parse(result)))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFailure(error instanceof LoginFailure ? error.kind : "unavailable");
        }
      });
    return () => controller.abort();
  }, [requestId, reload]);
  useEffect(() => {
    if (!context) {
      return;
    }
    const remaining = Date.parse(context.expiresAt) - Date.now();
    const timer = window.setTimeout(() => setFailure("expired"), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [context]);
  useEffect(() => {
    if (failure) {
      errorRef.current?.focus();
    }
  }, [failure]);

  async function act(body: object, path: string) {
    if (!context || busy) {
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const result = SsoRedirectSchema.parse(await request(path, body));
      const redirect = new URL(result.redirectTo);
      if (
        redirect.origin !== context.appOrigin ||
        !["/auth/callback", "/auth/logged-out"].includes(redirect.pathname)
      ) {
        throw new LoginFailure("expired");
      }
      window.location.assign(redirect.toString());
    } catch (error: unknown) {
      setFailure(error instanceof LoginFailure ? error.kind : "unavailable");
      setBusy(false);
    }
  }
  async function sendCode(email: string) {
    if (!context || !requestId || busy) {
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await request("/sso/email-code/request", { requestId, csrfToken: context.csrfToken, email });
      setCodeSent(true);
      setResendAt(Date.now() + 60_000);
    } catch (error: unknown) {
      setFailure(error instanceof LoginFailure ? error.kind : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || !requestId || busy) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "");
    if (mode === "code" && !codeSent) {
      void sendCode(email);
      return;
    }
    const fields =
      mode === "code"
        ? { code: String(data.get("code") ?? "") }
        : { password: String(data.get("password") ?? "") };
    void act(
      { requestId, csrfToken: context.csrfToken, email, ...fields },
      mode === "code" ? "/sso/email-code/verify" : "/sso/login"
    ).finally(() => {
      const password = form.elements.namedItem("password");
      if (password instanceof HTMLInputElement) {
        password.value = "";
      }
    });
  }
  useEffect(() => {
    if (codeSent) {
      document.getElementById("code")?.focus();
    }
  }, [codeSent]);
  useEffect(() => {
    if (!resendAt) {
      return;
    }
    const tick = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  const terminal = failure === "expired" || failure === "conflict";
  return (
    <div className="login-shell">
      <header>
        <Logo size="md" />
        <label className="language">
          {copy.language}
          <select
            aria-label={copy.language}
            value={locale}
            onChange={(event) => setLocale(event.target.value as LoginLocale)}
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </label>
      </header>
      <main>
        <section className="login-intro">
          <span className="eyebrow">CORELY</span>
          <h1>{copy.heading}</h1>
          <p>{copy.intro}</p>
          <div className="trust-note">
            <span aria-hidden="true">↗</span>
            <p>{copy.security}</p>
          </div>
        </section>
        <section
          className="login-card"
          aria-label={copy.attention}
          aria-busy={busy || (!context && !failure)}
        >
          <div className="card-marker" aria-hidden="true">
            C
          </div>
          <h2>{context ? `${copy.continuing} ${appNames[context.appKey]}` : copy.attention}</h2>
          {!context && !failure && <p role="status">{copy.loading}</p>}
          {failure && (
            <p className="login-error" role="alert" tabIndex={-1} ref={errorRef}>
              {failure === "invalid" && mode === "code" ? copy.codeInvalid : copy[failure]}
            </p>
          )}
          {context && !terminal && (
            <form id="login-form" onSubmit={submit}>
              <label htmlFor="email">{copy.email}</label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                readOnly={mode === "code" && codeSent}
                required
                maxLength={254}
                disabled={busy}
                placeholder="you@example.com"
              />
              {mode === "password" && (
                <>
                  <label htmlFor="password">{copy.password}</label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={256}
                    disabled={busy}
                  />
                </>
              )}
              {mode === "code" && codeSent && (
                <>
                  <p className="code-sent" role="status">
                    {copy.sent}
                  </p>
                  <label htmlFor="code">{copy.codeLabel}</label>
                  <Input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    required
                    maxLength={6}
                    disabled={busy}
                  />
                </>
              )}
              <Button className="primary-button" type="submit" disabled={busy}>
                {busy
                  ? copy.signing
                  : mode === "password"
                    ? copy.submit
                    : codeSent
                      ? copy.verifyCode
                      : copy.sendCode}
                <span aria-hidden="true">→</span>
              </Button>
            </form>
          )}
          {failure === "unavailable" && !context && (
            <Button className="primary-button" onClick={() => setReload((value) => value + 1)}>
              {copy.retry}
            </Button>
          )}
          {context && !terminal && (
            <div className="method-buttons">
              {mode === "code" && codeSent && (
                <Button
                  variant="ghost"
                  disabled={busy || seconds > 0}
                  onClick={() => {
                    const form = document.getElementById("login-form");
                    if (form instanceof HTMLFormElement) {
                      void sendCode(String(new FormData(form).get("email") ?? ""));
                    }
                  }}
                >
                  {copy.resend}
                  {seconds > 0 ? ` (${seconds}s)` : ""}
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setMode(mode === "code" ? "password" : "code");
                  setFailure(null);
                  setCodeSent(false);
                }}
              >
                {mode === "code" ? copy.passwordInstead : copy.codeInstead}
              </Button>
            </div>
          )}
          {context && !terminal && (
            <Button
              variant="ghost"
              className="cancel-button"
              disabled={busy}
              onClick={() => {
                if (requestId) {
                  void act({ requestId, csrfToken: context.csrfToken }, "/sso/cancel");
                }
              }}
            >
              {copy.cancel}
            </Button>
          )}
          {context?.accountOrigin && (
            <div className="account-links">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`${context.accountOrigin}/auth/forgot-password`}
              >
                {copy.recovery}
              </a>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`${context.accountOrigin}/auth/signup`}
              >
                {copy.signup}
              </a>
              <p>{copy.recoveryHint}</p>
            </div>
          )}
          <p className="invitation-note">{copy.expiredInvite}</p>
        </section>
      </main>
      <footer>{copy.footer}</footer>
    </div>
  );
}
