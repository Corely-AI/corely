import React from "react";
import { cn } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { useOnboarding } from "../engine/use-onboarding";
import { OnboardingStepRenderer } from "./OnboardingStepRenderer";
import type { OnboardingJourneyConfig } from "@corely/contracts";

export interface OnboardingShellProps {
  config: OnboardingJourneyConfig;
  onCompleted?: () => void;
  onExit?: () => void;
}

export const OnboardingShell = ({ config, onCompleted, onExit }: OnboardingShellProps) => {
  const { t } = useTranslation();
  const { isLoaded, isComplete } = useOnboarding({ config, onCompleted });
  const hasRedirectedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isComplete || hasRedirectedRef.current) {
      return;
    }
    hasRedirectedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      onCompleted?.();
    }, 800);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isComplete, onCompleted]);

  if (!isLoaded) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-testid="onboarding-loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="sr-only">{t("onboarding.loading")}</span>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background lg:flex-row"
      data-testid="onboarding-shell"
    >
      <div className="relative z-10 hidden w-96 shrink-0 flex-col border-r bg-muted/30 lg:flex">
        <OnboardingHeader config={config} onExit={onExit} />
        <div className="flex-1 overflow-y-auto p-6">
          <OnboardingChecklist config={config} />
        </div>
      </div>

      <main className="relative flex flex-1 flex-col overflow-y-auto">
        <div className="lg:hidden">
          <OnboardingHeader config={config} onExit={onExit} />
        </div>
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-6 md:p-12">
          {isComplete ? (
            <div className="text-center" data-testid="onboarding-complete">
              <h2 className="text-2xl font-semibold">{t("onboarding.allSet")}</h2>
              <p className="mt-2 text-muted-foreground">{t("onboarding.redirectingToDashboard")}</p>
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              <OnboardingStepRenderer config={config} onCompleted={onCompleted} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
