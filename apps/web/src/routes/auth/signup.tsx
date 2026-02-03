import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";

/**
 * Signup Page
 */
export const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signup, error: authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Basic validation
    if (password.length < 6) {
      setError(t("auth.errors.passwordLength"));
      setIsLoading(false);
      return;
    }

    try {
      await signup({
        email,
        password,
      });

      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "Failed to fetch") {
        setError(t("auth.errors.networkError"));
      } else {
        setError(t("auth.errors.signupFailed"));
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
                {t("auth.signup.title")}
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
                    autoComplete="new-password"
                    required
                    placeholder={t("auth.placeholders.passwordMin")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("auth.help.passwordMin")}</p>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} variant="accent" className="w-full h-11">
                {isLoading ? t("auth.signup.creating") : t("auth.signup.cta")}
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  {t("auth.signup.hasAccount")}{" "}
                  <Link
                    to="/auth/login"
                    className="font-medium text-accent hover:underline underline-offset-4"
                  >
                    {t("auth.signin.cta")}
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

export default SignupPage;
