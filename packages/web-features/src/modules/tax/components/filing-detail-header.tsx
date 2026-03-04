import React from "react";
import { DetailScreenHeader } from "@corely/web-shared/shared/components/DetailScreenHeader";
import { formatDate } from "@corely/web-shared/shared/lib/formatters";
import type { TaxFilingDetail, TaxFilingStatus, TaxFilingType } from "@corely/contracts";

type FilingDetailHeaderProps = {
  filing: TaxFilingDetail;
  onBack: () => void;
  onAction: (actionKey: string) => Promise<void>;
  isLoading?: boolean;
  periodNavigation?: {
    hasPrevious: boolean;
    hasNext: boolean;
  };
};

const TYPE_LABELS: Record<TaxFilingType, string> = {
  vat: "VAT Filing",
  "vat-annual": "VAT Annual Filing",
  "income-annual": "Income Tax Filing",
  trade: "Trade Tax Filing",
  payroll: "Payroll Tax Filing",
  "corporate-annual": "Corporate Tax Filing",
  "year-end": "Year-End Filing",
  other: "Tax Filing",
};

const STATUS_LABELS: Record<TaxFilingStatus, string> = {
  draft: "Draft",
  needsFix: "Needs attention",
  readyForReview: "Ready for review",
  submitted: "Submitted",
  paid: "Paid",
  archived: "Archived",
};

const STATUS_TONES: Record<TaxFilingStatus, string> = {
  draft: "muted",
  needsFix: "destructive",
  readyForReview: "accent",
  submitted: "default",
  paid: "success",
  archived: "muted",
};

const resolvePrimaryAction = (filing: TaxFilingDetail) => {
  if (filing.status === "needsFix") {
    return {
      key: "review",
      label: "Continue review",
      placement: "primary" as const,
      enabled: true,
    };
  }
  if (["draft", "readyForReview"].includes(filing.status)) {
    return { key: "review", label: "Review", placement: "primary" as const, enabled: true };
  }
  if (filing.status === "submitted") {
    return filing.capabilities.paymentsEnabled
      ? {
          key: "markPaid",
          label: "Mark paid",
          placement: "primary" as const,
          enabled: filing.capabilities.canMarkPaid,
        }
      : { key: "view", label: "View", placement: "primary" as const, enabled: true };
  }
  if (filing.status === "paid") {
    return { key: "view", label: "View", placement: "primary" as const, enabled: true };
  }
  return { key: "review", label: "Review", placement: "primary" as const, enabled: true };
};

export function FilingDetailHeader({
  filing,
  onBack,
  onAction,
  isLoading,
  periodNavigation,
}: FilingDetailHeaderProps) {
  const daysLeft = Math.ceil(
    (new Date(filing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const dueLabel =
    daysLeft > 0
      ? `Due ${formatDate(filing.dueDate, "en-US")} • ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
      : `Due ${formatDate(filing.dueDate, "en-US")}`;
  const primaryAction = resolvePrimaryAction(filing);
  const actions = [
    ...(periodNavigation
      ? [
          {
            key: "previousPeriod",
            label: "Previous period",
            placement: "secondary" as const,
            enabled: periodNavigation.hasPrevious,
          },
          {
            key: "nextPeriod",
            label: "Next period",
            placement: "secondary" as const,
            enabled: periodNavigation.hasNext,
          },
        ]
      : []),
    {
      key: "recalculate",
      label: "Recalculate",
      icon: "History",
      placement: "secondary" as const,
      enabled: filing.capabilities.canRecalculate,
    },
    {
      key: "exportPdf",
      label: "Export PDF",
      icon: "Download",
      placement: "secondary" as const,
      enabled: true,
    },
    {
      key: "exportCsv",
      label: "Export CSV",
      icon: "FileSpreadsheet",
      placement: "overflow" as const,
      enabled: true,
    },
    {
      key: "delete",
      label: "Delete filing",
      icon: "XCircle",
      placement: "danger" as const,
      enabled: filing.capabilities.canDelete && filing.status === "draft",
      dangerous: true,
      confirmTitle: "Delete filing?",
      confirmMessage: "This action cannot be undone.",
    },
    primaryAction,
  ];

  return (
    <DetailScreenHeader
      title={`${TYPE_LABELS[filing.type]} — ${filing.periodLabel}`}
      subtitle={dueLabel}
      capabilities={{
        status: {
          value: filing.status,
          label: STATUS_LABELS[filing.status],
          tone: STATUS_TONES[filing.status],
        },
        actions,
      }}
      onBack={onBack}
      onAction={onAction}
      isLoading={isLoading}
    />
  );
}
