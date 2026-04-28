import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { ensureDefaultWorkspace } from "@corely/web-shared";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useTranslation } from "react-i18next";
import { normalizeError } from "@corely/api-client";
import { pingApi } from "../../lib/ping-api";

export const SignupPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { signup, error: authError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const language =
    i18n.resolvedLanguage?.startsWith("de") || i18n.language?.startsWith("de")
      ? "de"
      : i18n.resolvedLanguage?.startsWith("vi") || i18n.language?.startsWith("vi")
        ? "vi"
        : "en";

  useEffect(() => {
    pingApi("signup");
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("auth.errors.passwordLength"));
      return;
    }

    setIsLoading(true);
    try {
      await signup({ email, password, fullName: fullName.trim() || undefined });
      await ensureDefaultWorkspace(email);
      navigate("/cash/registers", { replace: true });
    } catch (err) {
      const apiError = normalizeError(err);
      const message = apiError.isNetworkError
        ? t("auth.errors.networkError")
        : apiError.detail || t("auth.errors.signupFailed");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error || authError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{t("auth.signup.title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("auth.signup.subtitle")}</p>
            </div>
            <select
              value={language}
              onChange={(event) => i18n.changeLanguage(event.target.value)}
              className="h-9 rounded-md border border-border/60 bg-muted/30 px-2 text-xs text-foreground"
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {displayError ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {displayError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="fullName">{t("auth.fields.fullName")}</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder={t("auth.placeholders.fullName")}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.fields.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.placeholders.email")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.fields.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.placeholders.passwordMin")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="mx-auto block w-full max-w-[220px]"
              disabled={isLoading}
            >
              {isLoading ? t("auth.signup.creating") : t("auth.signup.cta")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t("auth.signup.hasAccount")}{" "}
              <Link to="/auth/login" className="text-accent">
                {t("auth.signin.cta")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;
