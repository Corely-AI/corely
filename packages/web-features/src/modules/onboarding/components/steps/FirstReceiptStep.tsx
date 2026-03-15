import React, { useState } from "react";
import { Button } from "@corely/ui";
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
  const analytics = useOnboardingAnalytics();
  const [uploaded, setUploaded] = useState(false);

  const handleUploadMock = () => {
    setUploaded(true);
    analytics.track("onboarding.first_receipt_attached", {});
    setTimeout(() => {
      onAdvance();
    }, 1500);
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];

  return (
    <div className="mx-auto flex max-w-md flex-col p-6 lg:p-12 text-center">
      <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
        <ImagePlus className="h-8 w-8" />
      </div>

      <h1 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mb-10 text-muted-foreground">{desc}</p>

      {!uploaded ? (
        <div className="space-y-4">
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <FileDown className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="font-medium">Click to upload or drag & drop</span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</span>
            <input
              id="receipt-upload"
              type="file"
              className="sr-only"
              onChange={handleUploadMock} // MOCK logic
              disabled={isSaving}
            />
          </label>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onSkip()}
            disabled={isSaving}
          >
            I'll do this later
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold text-foreground">Receipt attached!</h3>
          <p className="text-muted-foreground mt-2">Moving to next step...</p>
        </div>
      )}
    </div>
  );
};
