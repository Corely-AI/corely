import React from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { ArrowLeft, X } from "lucide-react";
import type { OnboardingJourneyConfig } from "@corely/contracts";

export interface OnboardingHeaderProps {
  config: OnboardingJourneyConfig;
  onExit?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const OnboardingHeader = ({ onExit, onBack, canGoBack = false }: OnboardingHeaderProps) => {
  const { t } = useTranslation();
  return (
    <header
      className="flex shrink-0 items-center justify-between border-b bg-background px-6 py-4"
      data-testid="onboarding-header"
    >
      <div className="flex items-center gap-4">
        {canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t("onboarding.goBack")}
            data-testid="onboarding-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          {/* Typically replace with the actual Corely logo */}
          <div className="h-6 w-6 rounded-md bg-primary" />
          <span className="font-semibold tracking-tight text-foreground">Corely</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onExit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="gap-2"
            data-testid="onboarding-exit"
          >
            <span>{t("onboarding.saveAndExit")}</span>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
};
