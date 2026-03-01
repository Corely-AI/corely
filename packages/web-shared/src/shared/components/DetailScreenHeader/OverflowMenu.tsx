import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { MoreVertical } from "lucide-react";
import { cn } from "@corely/web-shared/shared/lib/utils";
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

interface OverflowMenuProps {
  actions: RecordAction[] | undefined;
  onAction?: (key: string) => Promise<void>;
}

export function OverflowMenu({ actions, onAction }: OverflowMenuProps) {
  const { t } = useTranslation();
  const safeActions = actions ?? [];
  const overflowActions = safeActions.filter((a) => a.placement === "overflow");
  const dangerActions = safeActions.filter((a) => a.placement === "danger");
  const [confirmAction, setConfirmAction] = useState<RecordAction | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  if (overflowActions.length === 0 && dangerActions.length === 0) {
    return null;
  }

  const handleActionClick = (action: RecordAction) => {
    if (action.dangerous) {
      setConfirmAction(action);
      setConfirmInput("");
    } else {
      if (action.key) {
        void onAction?.(action.key);
      }
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) {
      return;
    }
    if (confirmAction.key) {
      await onAction?.(confirmAction.key);
    }
    setConfirmAction(null);
    setConfirmInput("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t("common.moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {overflowActions.length > 0 && (
            <>
              <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
              {overflowActions.map((action, index) => {
                const Icon = getIcon(action.icon);
                const label = action.label ?? t("common.action");
                return (
                  <DropdownMenuItem
                    key={action.key ?? action.label ?? index}
                    disabled={!action.enabled}
                    onClick={() => handleActionClick(action)}
                    className={cn(!action.enabled && "opacity-50")}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-2" />}
                    {label}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}

          {dangerActions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-destructive">
                {t("common.dangerZone")}
              </DropdownMenuLabel>
              {dangerActions.map((action, index) => {
                const Icon = getIcon(action.icon);
                const label = action.label ?? t("common.action");
                return (
                  <DropdownMenuItem
                    key={action.key ?? action.label ?? index}
                    disabled={!action.enabled}
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      "text-destructive focus:text-destructive",
                      !action.enabled && "opacity-50"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-2" />}
                    {label}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog for dangerous actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmTitle || t("common.confirmAction")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmMessage || t("common.confirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.requiresInput && (
            <div className="py-4">
              <Label htmlFor="action-confirm-input" className="text-sm font-medium">
                {confirmAction.requiresInput === "reason"
                  ? t("common.reason")
                  : confirmAction.requiresInput}
              </Label>
              <Input
                id="action-confirm-input"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={
                  confirmAction.requiresInput === "reason" ? t("common.reasonPlaceholder") : ""
                }
                className="mt-2"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmAction?.requiresInput ? !confirmInput.trim() : false}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
