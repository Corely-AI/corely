/**
 * DetailScreenHeader - Standardized header component for record detail screens
 *
 * Displays:
 * - Back navigation
 * - Title/subtitle
 * - Status chip with transitions popover
 * - Derived badges (Overdue, Partially Paid, etc.)
 * - Actions (Primary/Secondary/Overflow)
 *
 * @see docs/specs/detail-screen-header-standard.md
 */

import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { StatusChip } from "./DetailScreenHeader/StatusChip";
import { DerivedBadges } from "./DetailScreenHeader/DerivedBadges";
import { ActionButton } from "./DetailScreenHeader/ActionButton";
import { OverflowMenu } from "./DetailScreenHeader/OverflowMenu";

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

export interface DetailScreenHeaderProps {
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

export function DetailScreenHeader({
  title,
  subtitle,
  capabilities,
  onBack,
  onTransition,
  onAction,
  isLoading,
}: DetailScreenHeaderProps) {
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

export default DetailScreenHeader;
