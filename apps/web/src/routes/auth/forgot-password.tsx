import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import type { PasswordResetRequestInput, PasswordResetRequestResponse } from "@corely/contracts";
import { normalizeError } from "@corely/api-client";
import { apiClient } from "@/lib/api-client";

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (payload: PasswordResetRequestInput) => {
      return apiClient.post<PasswordResetRequestResponse>("/auth/password-reset/request", payload);
    },
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      const apiError = normalizeError(err);
      const fallback = apiError.isNetworkError
        ? t("auth.errors.networkError")
        : apiError.detail || t("auth.errors.requestFailed");
      setError(fallback);
      toast.error(fallback);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate({ email: email.trim() });
  };

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
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-foreground">{t("auth.forgot.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("auth.forgot.subtitle")}</p>
            </div>

            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-md bg-primary/10 p-3">
                  <p className="text-sm text-primary text-center">
                    {t("auth.forgot.successMessage", { email: email || "your email" })}
                  </p>
                </div>
                <div className="text-center">
                  <Link
                    to="/auth/login"
                    className="font-medium text-accent hover:underline underline-offset-4"
                  >
                    {t("auth.forgot.backToLogin")}
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm text-destructive text-center">{error}</p>
                  </div>
                )}

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

                <Button
                  type="submit"
                  variant="accent"
                  className="w-full h-11"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? t("auth.forgot.sending") : t("auth.forgot.cta")}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/auth/login"
                    className="font-medium text-accent hover:underline underline-offset-4"
                  >
                    {t("auth.forgot.backToLogin")}
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
