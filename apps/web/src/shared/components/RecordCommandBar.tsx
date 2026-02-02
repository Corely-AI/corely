/**
 * RecordCommandBar - Standardized header component for record detail screens
 *
 * Displays:
 * - Back navigation
 * - Title/subtitle
 * - Status chip with transitions popover
 * - Derived badges (Overdue, Partially Paid, etc.)
 * - Actions (Primary/Secondary/Overflow)
 *
 * @see docs/specs/record-command-bar-standard.md
 */

import React, { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Download,
  FileCheck,
  Copy,
  Mail,
  Bell,
  History,
  FileSpreadsheet,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/shared/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "react-i18next";
type RecordCapabilities = {
  status?: {
    value?: string;
    label?: string;
    tone?: string;
  };
  badges?: Array<{
    key?: string;
    label?: string;
    tone?: string;
  }>;
  transitions?: Array<{
    to?: string;
    label?: string;
    enabled?: boolean;
    reason?: string;
    dangerous?: boolean;
    confirmTitle?: string;
    confirmMessage?: string;
    requiresInput?: string;
  }>;
  actions?: Array<{
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
  }>;
};

// -----------------------------------------------------------------------------
// Icon Map
// -----------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  FileCheck,
  CreditCard,
  Download,
  Copy,
  Mail,
  Bell,
  History,
  FileSpreadsheet,
  XCircle,
};

function getIcon(iconName?: string): React.ElementType | null {
  if (!iconName) {
    return null;
  }
  return ICON_MAP[iconName] || null;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RecordCommandBarProps {
  /** Main title (e.g., "Invoice INV-2024-0042") */
  title: string;
  /** Subtitle (e.g., "Customer: Acme Corp") */
  subtitle?: string;
  /** Capabilities contract from API */
  capabilities: RecordCapabilities;
  /** Called when user clicks back button */
  onBack?: () => void;
  /** Called when user selects a status transition */
  onTransition?: (to: string, input?: Record<string, string>) => Promise<void>;
  /** Called when user triggers an action */
  onAction?: (actionKey: string) => Promise<void>;
  /** Whether any operation is in progress */
  isLoading?: boolean;
}

// -----------------------------------------------------------------------------
// Status Chip
// -----------------------------------------------------------------------------

const STATUS_TONE_CLASSES: Record<string, string> = {
  muted: "bg-muted text-muted-foreground",
  default: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  destructive: "bg-destructive/10 text-destructive",
};

interface StatusChipProps {
  capabilities: RecordCapabilities;
  onTransition?: (to: string, input?: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}

function StatusChip({ capabilities, onTransition, disabled }: StatusChipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState<
    RecordCapabilities["transitions"][number] | null
  >(null);
  const [confirmInput, setConfirmInput] = useState("");

  const status = capabilities.status;
  const transitions = capabilities.transitions ?? [];
  const hasTransitions = transitions.length > 0;
  const toneClass = status
    ? STATUS_TONE_CLASSES[status.tone ?? "muted"] || STATUS_TONE_CLASSES.muted
    : STATUS_TONE_CLASSES.muted;

  const handleTransitionClick = (transition: RecordCapabilities["transitions"][number]) => {
    if (!transition.enabled) {
      return;
    }
    if (!transition.to) {
      return;
    }

    if (transition.dangerous) {
      setConfirmTransition(transition);
      setConfirmInput("");
      setOpen(false);
    } else {
      void onTransition?.(transition.to);
      setOpen(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmTransition) {
      return;
    }
    if (!confirmTransition.to) {
      return;
    }
    const input = confirmTransition.requiresInput
      ? { [confirmTransition.requiresInput]: confirmInput }
      : undefined;
    await onTransition?.(confirmTransition.to, input);
    setConfirmTransition(null);
    setConfirmInput("");
  };

  if (!status) {
    return null;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled || !hasTransitions}>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              toneClass,
              hasTransitions && !disabled && "cursor-pointer hover:opacity-80",
              !hasTransitions && "cursor-default"
            )}
            type="button"
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            {status.label ?? t("common.status")}
            {hasTransitions && !disabled && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">{t("common.changeStatus")}</p>
          </div>
          <div className="p-1">
            {/* Current status */}
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", toneClass)} />
              <span className="font-medium">{status.label ?? t("common.status")}</span>
              <span className="text-muted-foreground text-xs">({t("common.current")})</span>
            </div>

            {/* Available transitions */}
            {transitions
              .filter((t) => !t.dangerous)
              .map((transition, index) => (
                <TooltipProvider key={transition.to ?? transition.label ?? index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleTransitionClick(transition)}
                        disabled={!transition.enabled}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-left",
                          transition.enabled
                            ? "hover:bg-muted cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        {transition.label ?? t("common.action")}
                      </button>
                    </TooltipTrigger>
                    {!transition.enabled && transition.reason && (
                      <TooltipContent>
                        <p>{transition.reason}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}

            {/* Dangerous transitions */}
            {transitions.filter((t) => t.dangerous).length > 0 && (
              <>
                <div className="my-1 border-t border-border" />
                {transitions
                  .filter((t) => t.dangerous)
                  .map((transition, index) => (
                    <TooltipProvider key={transition.to ?? transition.label ?? index}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleTransitionClick(transition)}
                            disabled={!transition.enabled}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-left",
                              transition.enabled
                                ? "text-destructive hover:bg-destructive/10 cursor-pointer"
                                : "opacity-50 cursor-not-allowed text-muted-foreground"
                            )}
                          >
                            <XCircle className="h-4 w-4" />
                            {transition.label ?? t("common.action")}
                          </button>
                        </TooltipTrigger>
                        {!transition.enabled && transition.reason && (
                          <TooltipContent>
                            <p>{transition.reason}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ))}
              </>
            )}
          </div>
          <div className="p-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">{t("common.statusAuditTrail")}</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmTransition}
        onOpenChange={(open) => !open && setConfirmTransition(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTransition?.confirmTitle || t("common.confirmAction")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTransition?.confirmMessage || t("common.confirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmTransition?.requiresInput && (
            <div className="py-4">
              <Label htmlFor="confirm-input" className="text-sm font-medium">
                {confirmTransition.requiresInput === "reason"
                  ? t("common.reason")
                  : confirmTransition.requiresInput}
              </Label>
              <Input
                id="confirm-input"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={
                  confirmTransition.requiresInput === "reason" ? t("common.reasonPlaceholder") : ""
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
              disabled={confirmTransition?.requiresInput && !confirmInput.trim()}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Derived Badges
// -----------------------------------------------------------------------------

const BADGE_TONE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  warning: "destructive",
  info: "secondary",
  success: "default",
  muted: "outline",
};

function DerivedBadges({ badges }: { badges?: RecordCapabilities["badges"] }) {
  const { t } = useTranslation();
  if (!badges?.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {badges.map((badge, index) => (
        <Badge
          key={badge.key ?? badge.label ?? index}
          variant={BADGE_TONE_VARIANTS[badge.tone ?? "muted"] || "outline"}
          className="text-xs"
        >
          {badge.label ?? t("common.badge")}
        </Badge>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Action Button
// -----------------------------------------------------------------------------

interface ActionButtonProps {
  action: RecordCapabilities["actions"][number];
  onAction?: (key: string) => Promise<void>;
  variant?: "accent" | "outline" | "secondary" | "ghost";
}

function ActionButton({ action, onAction, variant = "outline" }: ActionButtonProps) {
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

// -----------------------------------------------------------------------------
// Overflow Menu
// -----------------------------------------------------------------------------

interface OverflowMenuProps {
  actions: RecordCapabilities["actions"];
  onAction?: (key: string) => Promise<void>;
}

function OverflowMenu({ actions, onAction }: OverflowMenuProps) {
  const { t } = useTranslation();
  const safeActions = actions ?? [];
  const overflowActions = safeActions.filter((a) => a.placement === "overflow");
  const dangerActions = safeActions.filter((a) => a.placement === "danger");
  const [confirmAction, setConfirmAction] = useState<RecordCapabilities["actions"][number] | null>(
    null
  );
  const [confirmInput, setConfirmInput] = useState("");

  if (overflowActions.length === 0 && dangerActions.length === 0) {
    return null;
  }

  const handleActionClick = (action: RecordCapabilities["actions"][number]) => {
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

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function RecordCommandBar({
  title,
  subtitle,
  capabilities,
  onBack,
  onTransition,
  onAction,
  isLoading,
}: RecordCommandBarProps) {
  const { t } = useTranslation();
  const actions = capabilities.actions ?? [];
  const badges = capabilities.badges ?? [];

  const primaryAction = actions.find((a) => a.placement === "primary");
  const secondaryActions = actions.filter((a) => a.placement === "secondary");

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left Zone: Back + Title */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">{t("common.goBack")}</span>
          </Button>
        )}
        <div>
          <h1 className="text-h1 text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {/* Right Zone: Status + Badges + Actions */}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {/* Status Chip */}
        <StatusChip capabilities={capabilities} onTransition={onTransition} disabled={isLoading} />

        {/* Derived Badges */}
        <DerivedBadges badges={badges} />

        {/* Secondary Actions */}
        {secondaryActions.map((action) => (
          <ActionButton key={action.key} action={action} onAction={onAction} variant="outline" />
        ))}

        {/* Primary Action */}
        {primaryAction && (
          <ActionButton action={primaryAction} onAction={onAction} variant="accent" />
        )}

        {/* Overflow Menu */}
        <OverflowMenu actions={actions} onAction={onAction} />
      </div>
    </div>
  );
}

export default RecordCommandBar;
