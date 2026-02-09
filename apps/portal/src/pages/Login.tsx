import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../stores/auth";
import { useTranslation } from "react-i18next";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from "@corely/ui";
import { LogIn, Loader2, ArrowLeft, Mail } from "lucide-react";
import { portalRequest } from "../stores/workspace";

const RESEND_COOLDOWN = 60;

export const LoginPage = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const login = useAuthStore((state) => state.login);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Auto-focus code input
  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const handleRequestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await portalRequest({
        url: "/portal/auth/request-code",
        method: "POST",
        body: { email },
      });

      setStep("code");
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(err.message || t("portal.login.errors.send_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response: any = await portalRequest({
        url: "/portal/auth/verify-code",
        method: "POST",
        body: { email, code },
      });

      // The server sets HttpOnly refresh cookie automatically.
      // We receive the access token + user info in the response body.
      login(response.accessToken, response.user);
    } catch (err: any) {
      const message = err?.body?.message || err.message || t("portal.login.errors.verify_failed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await portalRequest({
        url: "/portal/auth/request-code",
        method: "POST",
        body: { email },
      });
      setResendCountdown(RESEND_COOLDOWN);
    } catch {
      // Silently fail (server always returns 200)
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      e.preventDefault();
      setCode(pasted);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              {step === "email" ? (
                <LogIn className="w-8 h-8 text-teal-400" />
              ) : (
                <Mail className="w-8 h-8 text-teal-400" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            {t("portal.login.title")}
          </CardTitle>
          <p className="text-slate-400 text-sm">
            {step === "email"
              ? t("portal.login.email_prompt")
              : t("portal.login.code_sent", { email })}
          </p>
        </CardHeader>

        {step === "email" ? (
          <form onSubmit={handleRequestCode}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  {t("portal.login.email_label")}
                </label>
                <Input
                  type="email"
                  placeholder={t("portal.login.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 focus:border-teal-500/50 transition-colors"
                  required
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold py-6 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("portal.login.send_code")
                )}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  {t("portal.login.code_label")}
                </label>
                <Input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder={t("portal.login.code_placeholder")}
                  value={code}
                  onChange={handleCodeChange}
                  onPaste={handlePaste}
                  className="bg-slate-800/50 border-slate-700 text-slate-200 focus:border-teal-500/50 transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> {t("portal.login.change_email")}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || loading}
                  className={`transition-colors ${
                    resendCountdown > 0
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-teal-400 hover:text-teal-300"
                  }`}
                >
                  {resendCountdown > 0
                    ? t("portal.login.resend_in", { count: resendCountdown })
                    : t("portal.login.resend_code")}
                </button>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold py-6 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("portal.login.verify_sign_in")
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
};
