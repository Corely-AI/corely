import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import type { PasswordResetConfirmInput, PasswordResetConfirmResponse } from "@corely/contracts";
import { normalizeError } from "@corely/api-client";
import { apiClient } from "@/lib/api-client";

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (payload: PasswordResetConfirmInput) => {
      return apiClient.post<PasswordResetConfirmResponse>("/auth/password-reset/confirm", payload);
    },
    onSuccess: () => {
      toast.success(t("auth.reset.successToast"));
      navigate("/auth/login");
    },
    onError: (err) => {
      const apiError = normalizeError(err);
      const fallback = apiError.isNetworkError
        ? t("auth.errors.networkError")
        : apiError.detail || t("auth.errors.resetFailed");
      setError(fallback);
      toast.error(fallback);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("auth.errors.missingResetToken"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("auth.errors.passwordLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.errors.passwordMismatch"));
      return;
    }

    mutation.mutate({ token, newPassword });
  };

  if (!token) {
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
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground text-center">
                {t("auth.reset.missingTokenTitle")}
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                {t("auth.reset.missingTokenMessage")}
              </p>
              <div className="text-center">
                <Link
                  to="/auth/forgot-password"
                  className="font-medium text-accent hover:underline underline-offset-4"
                >
                  {t("auth.reset.requestNewLink")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-semibold text-foreground">{t("auth.reset.title")}</h2>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm text-destructive text-center">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("auth.fields.password")}</Label>
                  <Input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder={t("auth.placeholders.passwordMin")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("auth.help.passwordMin")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("auth.reset.confirmLabel")}</Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder={t("auth.placeholders.password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                className="w-full h-11"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t("auth.reset.updating") : t("auth.reset.cta")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
