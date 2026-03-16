import React, { useState } from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { FileDown, ImagePlus, CheckCircle2, ArrowRight, UploadCloud, Sparkles } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

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
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-first-receipt"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <ImagePlus className="h-10 w-10" />
      </div>

      <div className="max-w-xl space-y-4 mb-16">
        <h1
          className="text-6xl font-black tracking-tight sm:text-7xl bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-[0.95]"
          data-testid="onboarding-step-title"
        >
          {title}
        </h1>
        <p
          className="text-2xl text-muted-foreground/80 leading-relaxed max-w-xl font-medium"
          data-testid="onboarding-step-description"
        >
          {desc}
        </p>
      </div>

      {!uploaded ? (
        <div className="space-y-10 max-w-2xl">
          <label
            htmlFor="receipt-upload"
            className={cn(
              "group relative flex flex-col items-center justify-center gap-8 rounded-[3rem] border-2 border-dashed p-16 cursor-pointer transition-all duration-700 overflow-hidden",
              "border-white/10 bg-white/[0.02] hover:bg-accent/[0.04] hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/10"
            )}
            data-testid="onboarding-receipt-upload"
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/5 text-muted-foreground transition-all duration-500 group-hover:bg-accent group-hover:text-accent-foreground group-hover:scale-110 group-hover:rotate-6 group-hover:glow-accent shadow-xl">
              <UploadCloud className="h-12 w-12" />
            </div>

            <div className="relative text-center space-y-3">
              <span className="block text-3xl font-black text-foreground/90 group-hover:text-accent transition-colors tracking-tight">
                {t("onboarding.receipt.uploadPrompt")}
              </span>
              <span className="block text-lg text-muted-foreground/40 font-medium">
                {t("onboarding.receipt.uploadHint")}
              </span>
            </div>

            <input
              id="receipt-upload"
              type="file"
              className="sr-only"
              onChange={handleUploadMock}
              data-testid="onboarding-receipt-input"
            />

            {/* Decorative corners */}
            <div className="absolute top-8 left-8 h-4 w-4 border-t-2 border-l-2 border-white/10 group-hover:border-accent/40 transition-colors" />
            <div className="absolute top-8 right-8 h-4 w-4 border-t-2 border-r-2 border-white/10 group-hover:border-accent/40 transition-colors" />
            <div className="absolute bottom-8 left-8 h-4 w-4 border-b-2 border-l-2 border-white/10 group-hover:border-accent/40 transition-colors" />
            <div className="absolute bottom-8 right-8 h-4 w-4 border-b-2 border-r-2 border-white/10 group-hover:border-accent/40 transition-colors" />
          </label>

          {error && (
            <p
              className="text-lg font-bold text-destructive mt-4 px-6 animate-in shake-2"
              data-testid="onboarding-receipt-error"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-6 pt-4">
            <Button
              variant="outline"
              size="lg"
              className="h-20 px-12 rounded-[2rem] text-xl font-black border-white/5 bg-white/[0.02] text-muted-foreground/50 hover:bg-white/5 hover:text-foreground transition-all duration-500 group"
              onClick={() => onSkip()}
              data-testid="onboarding-receipt-skip"
            >
              <span className="flex items-center gap-3">
                {t("onboarding.receipt.skipLabel")}
                <ArrowRight className="h-6 w-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-start py-8 animate-in zoom-in-95 duration-1000 max-w-2xl"
          data-testid="onboarding-receipt-success"
        >
          <div className="mb-12 p-10 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 flex items-center gap-8 w-full shadow-2xl shadow-emerald-500/10">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-emerald-500/20 text-emerald-400 glow-emerald shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-14 w-14" />
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-emerald-300 tracking-tight leading-tight">
                {t("onboarding.receipt.successTitle")}
              </h3>
              <p className="text-xl text-emerald-400/70 font-medium leading-relaxed">
                {t("onboarding.receipt.successDesc")}
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="h-20 px-16 rounded-[2rem] text-xl font-black bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 group shadow-2xl shadow-accent/20 w-full sm:w-auto"
            onClick={() => onAdvance()}
            data-testid="onboarding-receipt-continue"
          >
            <span className="flex items-center gap-4">
              {t("onboarding.receipt.continueLabel")}
              <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};
