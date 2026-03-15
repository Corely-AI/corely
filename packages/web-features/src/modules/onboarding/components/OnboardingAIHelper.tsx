import React from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, cn } from "@corely/ui";
import { Bot, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { OnboardingStepConfig } from "@corely/contracts";
import { useOnboardingAnalytics } from "../engine/use-onboarding-analytics";

export interface OnboardingAIHelperProps {
  step: OnboardingStepConfig;
  locale: string;
  className?: string;
}

export const OnboardingAIHelper = ({ step, locale, className }: OnboardingAIHelperProps) => {
  const navigate = useNavigate();
  const analytics = useOnboardingAnalytics();

  if (!step.aiHelpContext) {
    return null;
  }

  const handleOpenHelp = () => {
    analytics.track("onboarding.ai_helper_opened", { stepId: step.id, type: step.type });
    // Navigate to the assistant page since there's no drawer hook available
    navigate("/assistant");
  };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/60 shadow-sm", className)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">AI Assistant</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="mb-3 text-sm text-muted-foreground">
          Need help with this step? Ask our AI assistant to explain or suggest what to do next.
        </p>
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleOpenHelp}>
          <Sparkles className="h-4 w-4 text-amber-500" />
          Ask Assistant
        </Button>
      </CardContent>
    </Card>
  );
};
