import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Label, Logo } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { useAuth } from "@corely/web-shared/lib/auth-provider";

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { signin, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signin({ email, password });
      navigate(
        state?.from?.pathname?.startsWith("/sign")
          ? state.from.pathname + (state.from.search ?? "")
          : "/sign",
        { replace: true }
      );
    } catch {
      setError(t("auth.errors.loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Logo showText={false} />
            <h1 className="text-h1">Corely Sign</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.signin.title")}</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error || authError ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error || authError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.fields.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.fields.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {t(isLoading ? "auth.signin.signingIn" : "auth.signin.cta")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
