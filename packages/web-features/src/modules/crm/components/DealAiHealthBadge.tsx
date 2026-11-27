import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@corely/ui";
import type { DealAiHealth } from "@corely/contracts";

interface DealAiHealthBadgeProps {
  health: DealAiHealth | null;
  visible: boolean;
}

const badgeVariant = (status: DealAiHealth["status"]) => {
  if (status === "GOOD") {
    return "default";
  }
  if (status === "AT_RISK") {
    return "secondary";
  }
  return "destructive";
};

export const DealAiHealthBadge: React.FC<DealAiHealthBadgeProps> = ({ health, visible }) => {
  const uiCopy = useUiCopy("ui.crm-dealaihealthbadge");
  if (!visible || !health) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={badgeVariant(health.status)}>
          {uiCopy("health") + " "}
          {health.status.replace("_", " ")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p>{health.explanation}</p>
        <p className="text-xs mt-1">
          {uiCopy("win-probability") + " "}
          {Math.round(health.winProbability * 100)}
          {uiCopy("confidence")} {Math.round(health.confidence * 100)}%
          {health.lowConfidence ? uiCopy("low-confidence") : ""}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
