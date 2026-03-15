import React, { useState } from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { FileDown, ImagePlus, CheckCircle2 } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

export const FirstReceiptStep = ({
  config,
  locale,
  onAdvance,
  onSkip,
  isSaving,
}: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAllowedFile = (file: File) => {
    const allowed =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg") ||
      file.name.toLowerCase().endsWith(".png");
    return allowed && file.size <= 10 * 1024 * 1024;
  };

  const handleUploadMock = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!isAllowedFile(file)) {
      setError(t("onboarding.receipt.errorUnsupported"));
      return;
    }
    setError(null);
    setUploaded(true);
    analytics.track("onboarding.first_receipt_attached", {});
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];

  return (
    <div
      className="mx-auto flex max-w-md flex-col p-6 lg:p-12 text-center"
      data-testid="onboarding-step-first-receipt"
    >
      <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
        <ImagePlus className="h-8 w-8" />
      </div>

      <h1
        className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl"
        data-testid="onboarding-step-title"
      >
        {title}
      </h1>
      <p className="mb-10 text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      {!uploaded ? (
        <div className="space-y-4">
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            data-testid="onboarding-receipt-upload"
          >
            <FileDown className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="font-medium">{t("onboarding.receipt.uploadPrompt")}</span>
            <span className="text-xs text-muted-foreground">
              {t("onboarding.receipt.uploadHint")}
            </span>
            <input
              id="receipt-upload"
              type="file"
              className="sr-only"
              onChange={handleUploadMock} // MOCK logic
              data-testid="onboarding-receipt-input"
            />
          </label>
          {error && (
            <p className="text-sm text-destructive" data-testid="onboarding-receipt-error">
              {error}
            </p>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onSkip()}
            data-testid="onboarding-receipt-skip"
          >
            {t("onboarding.receipt.skipLabel")}
          </Button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300"
          data-testid="onboarding-receipt-success"
        >
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold text-foreground">
            {t("onboarding.receipt.successTitle")}
          </h3>
          <p className="text-muted-foreground mt-2">{t("onboarding.receipt.successDesc")}</p>
          <Button
            className="mt-6 w-full sm:w-auto"
            onClick={() => onAdvance()}
            data-testid="onboarding-receipt-continue"
          >
            {t("onboarding.receipt.continueLabel")}
          </Button>
        </div>
      )}
    </div>
  );
};
