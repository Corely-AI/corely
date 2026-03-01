import React from "react";
import { Button } from "@corely/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { getIcon } from "./icons";

type RecordAction = {
  key?: string;
  label?: string;
  icon?: string;
  placement?: "primary" | "secondary" | "overflow" | "danger";
  enabled?: boolean;
  reason?: string;
  dangerous?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  requiresInput?: string;
  href?: string;
  endpoint?: { method?: string; path?: string };
};

interface ActionButtonProps {
  action: RecordAction;
  onAction?: (key: string) => Promise<void>;
  variant?: "accent" | "outline" | "secondary" | "ghost";
}

export function ActionButton({ action, onAction, variant = "outline" }: ActionButtonProps) {
  const { t } = useTranslation();
  const Icon = getIcon(action.icon);
  const isEnabled = action.enabled ?? false;
  const label = action.label ?? t("common.action");
  const key = action.key;

  if (!key) {
    return null;
  }

  if (!isEnabled && action.reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant={variant} disabled className="opacity-50">
                {Icon && <Icon className="h-4 w-4 mr-2" />}
                {label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{action.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button variant={variant} disabled={!isEnabled} onClick={() => void onAction?.(key)}>
      {Icon && <Icon className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}
