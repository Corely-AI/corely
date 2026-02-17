import React from "react";
import type { BillingInvoiceSendProgress, BillingPreviewOutput } from "@corely/contracts";
import { FileText, Facebook, ExternalLink, RefreshCcw } from "lucide-react";
import { Badge } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/shared/lib/formatters";
import { ClassBillingLineRow } from "./ClassBillingLineRow";

type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED" | null;

type InvoiceByPayerAndClass = {
  map: Map<string, { invoiceId: string; invoiceStatus: InvoiceStatus }>;
  legacyByPayer: Map<string, { invoiceId: string; invoiceStatus: InvoiceStatus }>;
};

type Props = {
  resultSummary: string | null;
  isSendingInvoices: boolean;
  sendProgress: BillingInvoiceSendProgress | null;
  preview?: BillingPreviewOutput;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  nameByClient: Map<string, string>;
  emailByClient: Map<string, string | null>;
  facebookByClient: Map<string, string | null>;
  nameByGroup: Map<string, string>;
  invoiceByPayerAndClass: InvoiceByPayerAndClass;
  classGroupId: string;
  isFetching: boolean;
  isMarkSentPending: boolean;
  shareLinkPendingInvoiceId: string | null;
  shareLinksByInvoiceId: Record<string, string>;
  onOpenSendDialog: (invoiceId: string) => void;
  onMarkSent: (invoiceId: string, payerClientId: string) => void;
  onGenerateShareLink: (invoiceId: string) => void;
  onCopyShareLink: (invoiceId: string) => void;
  onRequestRegenerateShareLink: (invoiceId: string) => void;
};

export function ClassesBillingContent({
  resultSummary,
  isSendingInvoices,
  sendProgress,
  preview,
  isLoading,
  isError,
  error,
  nameByClient,
  emailByClient,
  facebookByClient,
  nameByGroup,
  invoiceByPayerAndClass,
  classGroupId,
  isFetching,
  isMarkSentPending,
  shareLinkPendingInvoiceId,
  shareLinksByInvoiceId,
  onOpenSendDialog,
  onMarkSent,
  onGenerateShareLink,
  onCopyShareLink,
  onRequestRegenerateShareLink,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      {resultSummary ? (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {resultSummary}
        </div>
      ) : null}

      {isSendingInvoices && sendProgress ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 animate-spin" />
          {t("classes.billing.sendInvoices")}: {sendProgress.processedInvoiceCount}/
          {sendProgress.expectedInvoiceCount} processed
        </div>
      ) : null}

      {preview && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 bg-muted/30 rounded-lg border border-border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">
              {t("classes.billing.strategy")}
            </span>
            <Badge variant="outline" className="bg-background/50">
              {preview.billingMonthStrategy === "PREPAID_CURRENT_MONTH"
                ? t("classes.billing.prepaid")
                : t("classes.billing.arrears")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">{t("classes.billing.basis")}</span>
            <Badge variant="outline" className="bg-background/50">
              {preview.billingBasis === "SCHEDULED_SESSIONS"
                ? t("classes.billing.scheduledBasis")
                : t("classes.billing.attendedBasis")}
            </Badge>
          </div>
          {preview.billingBasis === "ATTENDED_SESSIONS" && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {t("classes.billing.arrearsTip")}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <RefreshCcw className="h-8 w-8 animate-spin opacity-20" />
          <p className="text-sm">{t("classes.billing.loading")}</p>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(error as Error)?.message || t("classes.billing.loadFailed")}
        </div>
      ) : preview?.items?.length ? (
        <div className="grid gap-6 lg:grid-cols-1">
          {preview.items.map((item) => {
            return (
              <div
                key={item.payerClientId}
                className="rounded-lg border border-border bg-card overflow-hidden shadow-sm"
              >
                <div className="bg-muted/30 px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {nameByClient.get(item.payerClientId) ?? item.payerClientId}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2">
                      {emailByClient.has(item.payerClientId) ? (
                        emailByClient.get(item.payerClientId) ? (
                          <span className="text-muted-foreground">
                            {emailByClient.get(item.payerClientId)}
                          </span>
                        ) : (
                          <span className="text-destructive font-medium italic">Missing email</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">
                          {t("classes.billing.payerId")} {item.payerClientId}
                        </span>
                      )}
                      {facebookByClient.get(item.payerClientId) && (
                        <a
                          href={facebookByClient.get(item.payerClientId)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                          title="Open Facebook profile"
                        >
                          <Facebook className="h-3 w-3" />
                          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-bold text-foreground">
                        {formatMoney(item.totalAmountCents, undefined, item.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.totalSessions} {t("classes.billing.sessionsTotal")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          {t("classes.billing.classGroup")}
                        </th>
                        <th className="text-center text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          {t("classes.billing.sessions")}
                        </th>
                        <th className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          {t("classes.billing.pricePerSession")}
                        </th>
                        <th className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          {t("classes.billing.subtotal")}
                        </th>
                        <th className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          {t("classes.billing.invoice")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {item.lines.map((line) => {
                        const classScopedInvoice = invoiceByPayerAndClass.map.get(
                          `${item.payerClientId}:${line.classGroupId}`
                        );
                        const lineInvoice =
                          classScopedInvoice ??
                          (classGroupId === "ALL" && item.lines.length === 1
                            ? invoiceByPayerAndClass.legacyByPayer.get(item.payerClientId)
                            : undefined);

                        return (
                          <ClassBillingLineRow
                            key={line.classGroupId}
                            line={line}
                            currency={item.currency}
                            classGroupName={nameByGroup.get(line.classGroupId) ?? line.classGroupId}
                            lineInvoice={lineInvoice}
                            isFetching={isFetching}
                            isMarkSentPending={isMarkSentPending}
                            isShareLinkPending={
                              shareLinkPendingInvoiceId === lineInvoice?.invoiceId
                            }
                            payerEmail={emailByClient.get(item.payerClientId)}
                            privateLink={
                              lineInvoice ? shareLinksByInvoiceId[lineInvoice.invoiceId] : null
                            }
                            onOpenSendDialog={onOpenSendDialog}
                            onMarkSent={(invoiceId) => onMarkSent(invoiceId, item.payerClientId)}
                            onGenerateShareLink={onGenerateShareLink}
                            onCopyShareLink={onCopyShareLink}
                            onRequestRegenerateShareLink={onRequestRegenerateShareLink}
                            sendLabel={t("invoices.actions.send")}
                            markSentLabel={t("classes.billing.markSent")}
                            generateShareLinkLabel={t("classes.billing.generatePrivateLink")}
                            copyLinkLabel={t("classes.billing.copyLink")}
                            regenerateLinkLabel={t("classes.billing.regenerateLink")}
                            viewInvoiceLabel={t("classes.billing.viewInvoice")}
                            notCreatedLabel={t("classes.billing.invoiceNotCreated")}
                            moreActionsLabel={t("common.moreActions")}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
          <FileText className="h-10 w-10 text-muted-foreground opacity-20 mb-3" />
          <h3 className="text-lg font-medium text-foreground">{t("classes.billing.emptyTitle")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {t("classes.billing.emptyDescription")}
            {preview?.billingBasis === "ATTENDED_SESSIONS" && (
              <span className="block mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-md border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-medium">
                {t("classes.billing.attendedSessionsTip")}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
