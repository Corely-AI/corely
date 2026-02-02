import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Login Page
 */
export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signin, error: authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered credentials on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("corely-remember-login");
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { email?: string; password?: string; tenantId?: string };
      if (parsed.email) {
        setEmail(parsed.email);
      }
      if (parsed.password) {
        setPassword(parsed.password);
      }
      if (parsed.tenantId) {
        setTenantId(parsed.tenantId);
      }
      setRememberMe(true);
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signin({
        email,
        password,
        tenantId: tenantId || undefined,
      });

      // Persist credentials if requested
      if (rememberMe) {
        localStorage.setItem(
          "corely-remember-login",
          JSON.stringify({ email, password, tenantId: tenantId || undefined })
        );
      } else {
        localStorage.removeItem("corely-remember-login");
      }

      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "Failed to fetch") {
        setError(t("auth.errors.networkError"));
      } else {
        setError(t("auth.errors.loginFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const displayError =
    error || (authError === "Failed to fetch" ? t("auth.errors.networkError") : authError);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("common.appName")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("common.tagline")}</p>
        </div>

        <Card className="border shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground text-center">
                {t("auth.signin.title")}
              </h2>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {displayError && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm text-destructive text-center">{displayError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.fields.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    data-testid="login-email"
                    placeholder={t("auth.placeholders.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.fields.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    data-testid="login-password"
                    placeholder={t("auth.placeholders.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer group">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="group-hover:text-foreground transition-colors">
                    {t("auth.signin.rememberMe")}
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                data-testid="login-submit"
                disabled={isLoading}
                variant="accent"
                className="w-full h-11"
              >
                {isLoading ? t("auth.signin.signingIn") : t("auth.signin.cta")}
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  {t("auth.signin.noAccount")}{" "}
                  <Link
                    to="/auth/signup"
                    className="font-medium text-accent hover:underline underline-offset-4"
                  >
                    {t("auth.signup.cta")}
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
