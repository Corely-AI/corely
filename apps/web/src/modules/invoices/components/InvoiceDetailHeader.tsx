import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RecordCommandBar } from "@/shared/components/RecordCommandBar";
import { Button } from "@corely/ui";

interface InvoiceDetailHeaderProps {
  invoice: any;
  capabilities: any;
  isProcessing: boolean;
  onTransition: (to: string, input?: Record<string, string>) => Promise<void>;
  onAction: (key: string) => Promise<void>;
}

export function InvoiceDetailHeader({
  invoice,
  capabilities,
  isProcessing,
  onTransition,
  onAction,
}: InvoiceDetailHeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const translatedCapabilities = capabilities
    ? {
        ...capabilities,
        status: {
          ...capabilities.status,
          label: t(`invoices.statuses.${capabilities.status.value.toLowerCase()}`, {
            defaultValue: capabilities.status.label,
          }),
        },
        badges: capabilities.badges?.map((badge: any) => ({
          ...badge,
          label: t(`invoices.badges.${badge.key}`, { defaultValue: badge.label }),
        })),
        transitions: capabilities.transitions?.map((tr: any) => ({
          ...tr,
          label: t(`invoices.transitions.${tr.to}`, { defaultValue: tr.label }),
        })),
        actions: capabilities.actions?.map((ac: any) => ({
          ...ac,
          label: t(`invoices.actions.${ac.key}`, { defaultValue: ac.label }),
        })),
      }
    : null;

  if (!capabilities) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
          <span className="text-lg">←</span>
        </Button>
        <div>
          <h1 className="text-h1 text-foreground">
            {t("invoices.titleWithNumber", { number: invoice.number ?? t("common.draft") })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("common.createdAt", {
              date: invoice.createdAt
                ? new Date(invoice.createdAt).toLocaleDateString(i18n.language)
                : t("common.empty"),
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <RecordCommandBar
      title={t("invoices.titleWithNumber", {
        number: invoice.number ?? t("common.draft"),
      })}
      subtitle={t("common.createdAt", {
        date: invoice.createdAt
          ? new Date(invoice.createdAt).toLocaleDateString(i18n.language)
          : t("common.empty"),
      })}
      capabilities={translatedCapabilities}
      onBack={() => navigate("/invoices")}
      onTransition={onTransition}
      onAction={onAction}
      isLoading={isProcessing}
    />
  );
}
