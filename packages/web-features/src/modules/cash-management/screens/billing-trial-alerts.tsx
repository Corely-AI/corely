import type { BillingTrial } from "@corely/contracts";
import { Alert, AlertDescription, AlertTitle, Button, cn } from "@corely/ui";
import { AlertTriangle, Sparkles } from "lucide-react";

import type { BillingCopy } from "./billing-copy";

interface BillingTrialAlertsProps {
  trial: BillingTrial;
  copy: BillingCopy;
}

export function BillingTrialAlerts({ trial, copy }: BillingTrialAlertsProps) {
  return (
    <>
      {trial.status === "active" ? (
        <Alert
          className={cn(
            "border-emerald-500/35 bg-emerald-500/8",
            trial.isExpiringSoon && "border-amber-500/35 bg-amber-500/10"
          )}
        >
          <Sparkles className="h-4 w-4" />
          <AlertTitle>
            {trial.isExpiringSoon
              ? copy.trialExpiring(trial.daysRemaining)
              : copy.trialActive(trial.daysRemaining)}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{copy.afterTrialDescription}</span>
            <Button size="sm" asChild>
              <a href="#plan-catalog">{copy.upgradeNow}</a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {trial.status === "expired" ? (
        <Alert className="border-amber-500/35 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{copy.trialExpired}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{copy.trialExpiredDescription}</span>
            <Button size="sm" asChild>
              <a href="#plan-catalog">{copy.upgradeNow}</a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
