import React from "react";
import { DetailScreenHeader } from "@corely/web-shared/shared/components/DetailScreenHeader";
import { formatDate } from "@corely/web-shared/shared/lib/formatters";
import type { TaxFilingDetail, TaxFilingStatus } from "@corely/contracts";
import { useTranslation } from "react-i18next";

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

export function FilingDetailHeader({
  filing,
  onBack,
  onAction,
  isLoading,
  periodNavigation,
}: FilingDetailHeaderProps) {
  const { t, i18n } = useTranslation();
  const locale = t("common.locale", { defaultValue: i18n.language === "de" ? "de-DE" : "en-US" });

  const daysLeft = Math.ceil(
    (new Date(filing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const formattedDueDate = formatDate(filing.dueDate, locale);
  const dueLabel =
    daysLeft > 0
      ? t("tax.filingDetail.dueWithDays", { date: formattedDueDate, count: daysLeft })
      : t("tax.filingDetail.due", { date: formattedDueDate });

  const resolvePrimaryAction = React.useCallback(
    (f: TaxFilingDetail) => {
      if (f.status === "needsFix") {
        return {
          key: "review",
          label: t("tax.filingDetail.actions.continueReview"),
          placement: "primary" as const,
          enabled: true,
        };
      }
      if (["draft", "readyForReview"].includes(f.status)) {
        return {
          key: "review",
          label: t("tax.filingDetail.actions.review"),
          placement: "primary" as const,
          enabled: true,
        };
      }
      if (f.status === "submitted") {
        return f.capabilities.paymentsEnabled
          ? {
              key: "markPaid",
              label: t("tax.filingDetail.actions.markPaid"),
              placement: "primary" as const,
              enabled: f.capabilities.canMarkPaid,
            }
          : {
              key: "view",
              label: t("tax.filingDetail.actions.view"),
              placement: "primary" as const,
              enabled: true,
            };
      }
      if (f.status === "paid") {
        return {
          key: "view",
          label: t("tax.filingDetail.actions.view"),
          placement: "primary" as const,
          enabled: true,
        };
      }
      return {
        key: "review",
        label: t("tax.filingDetail.actions.review"),
        placement: "primary" as const,
        enabled: true,
      };
    },
    [t]
  );

  const primaryAction = resolvePrimaryAction(filing);

  const actions = [
    ...(periodNavigation
      ? [
          {
            key: "previousPeriod",
            label: t("tax.filingDetail.actions.previousPeriod"),
            placement: "secondary" as const,
            enabled: periodNavigation.hasPrevious,
          },
          {
            key: "nextPeriod",
            label: t("tax.filingDetail.actions.nextPeriod"),
            placement: "secondary" as const,
            enabled: periodNavigation.hasNext,
          },
        ]
      : []),
    {
      key: "recalculate",
      label: t("tax.filingDetail.actions.recalculate"),
      icon: "History",
      placement: "secondary" as const,
      enabled: filing.capabilities.canRecalculate,
    },
    {
      key: "exportPdf",
      label: t("tax.filingDetail.actions.exportPdf"),
      icon: "Download",
      placement: "secondary" as const,
      enabled: true,
    },
    {
      key: "exportCsv",
      label: t("tax.filingDetail.actions.exportCsv"),
      icon: "FileSpreadsheet",
      placement: "overflow" as const,
      enabled: true,
    },
    {
      key: "delete",
      label: t("tax.filingDetail.actions.delete"),
      icon: "XCircle",
      placement: "danger" as const,
      enabled: filing.capabilities.canDelete && filing.status === "draft",
      dangerous: true,
      confirmTitle: t("tax.filingDetail.actions.deleteConfirmTitle"),
      confirmMessage: t("tax.filingDetail.actions.deleteConfirmMessage"),
    },
    primaryAction,
  ];

  const typeLabel = t(`tax.filingDetail.types.${filing.type}`, { defaultValue: filing.type });
  const statusLabel = t(`tax.filingDetail.status.${filing.status}`, {
    defaultValue: filing.status,
  });

  const STATUS_TONES: Record<TaxFilingStatus, string> = {
    draft: "muted",
    needsFix: "destructive",
    readyForReview: "accent",
    submitted: "default",
    paid: "success",
    archived: "muted",
  };

  return (
    <DetailScreenHeader
      title={`${typeLabel} — ${filing.periodLabel}`}
      subtitle={dueLabel}
      capabilities={{
        status: {
          value: filing.status,
          label: statusLabel,
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
