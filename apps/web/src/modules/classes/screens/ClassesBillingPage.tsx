import React, { useMemo, useState } from "react";
import { normalizeError } from "@corely/api-client";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { BillingInvoiceSendProgress } from "@corely/contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { customersApi } from "@/lib/customers-api";
import { CrudListPageLayout } from "@/shared/crud";
import { classBillingKeys } from "../queries";
import { formatMoney } from "@/shared/lib/formatters";
import { useSendInvoice } from "../../invoices/hooks/use-send-invoice";
import { SendInvoiceDialog } from "../../invoices/components/SendInvoiceDialog";

const toMonthValue = (date: Date) => date.toISOString().slice(0, 7);
const getErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null;
  }

  const apiError = normalizeError(error);
  if (apiError.validationErrors?.length) {
    return apiError.validationErrors[0].message;
  }

  return apiError.detail || apiError.message || null;
};

export default function ClassesBillingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(toMonthValue(new Date()));
  const [classGroupId, setClassGroupId] = useState<string>("ALL");
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [sendPromptOpen, setSendPromptOpen] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [sendProgress, setSendProgress] = useState<BillingInvoiceSendProgress | null>(null);

  const {
    isOpen: sendDialogOpen,
    setIsOpen: setSendDialogOpen,
    isSending,
    isFetching,
    currentInvoice,
    openSendDialog,
    handleSend: handleSendInvoice,
  } = useSendInvoice();

  const {
    data: preview,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: classBillingKeys.preview(month, classGroupId),
    queryFn: () =>
      classesApi.getBillingPreview(month, {
        classGroupId: classGroupId === "ALL" ? undefined : classGroupId,
      }),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => customersApi.listCustomers({ pageSize: 200 }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ["class-groups", "options"],
    queryFn: () => classesApi.listClassGroups({ page: 1, pageSize: 200 }),
  });

  const nameByClient = useMemo(() => {
    const map = new Map<string, string>();
    (customersData?.customers ?? []).forEach((customer) => {
      map.set(customer.id, customer.displayName || customer.id);
    });
    return map;
  }, [customersData]);

  const emailByClient = useMemo(() => {
    const map = new Map<string, string | null>();
    (customersData?.customers ?? []).forEach((customer) => {
      map.set(customer.id, customer.email ?? null);
    });
    return map;
  }, [customersData]);

  const nameByGroup = useMemo(() => {
    const map = new Map<string, string>();
    (groupsData?.items ?? []).forEach((group) => {
      map.set(group.id, group.name);
    });
    return map;
  }, [groupsData]);

  const invoiceByPayerAndClass = useMemo(() => {
    const map = new Map<
      string,
      { invoiceId: string; invoiceStatus: "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED" | null }
    >();
    const legacyByPayer = new Map<
      string,
      { invoiceId: string; invoiceStatus: "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED" | null }
    >();
    (preview?.invoiceLinks ?? []).forEach((link) => {
      const invoice = {
        invoiceId: link.invoiceId,
        invoiceStatus: link.invoiceStatus ?? null,
      };
      if (link.classGroupId) {
        map.set(`${link.payerClientId}:${link.classGroupId}`, invoice);
      } else {
        legacyByPayer.set(link.payerClientId, invoice);
      }
    });
    return { map, legacyByPayer };
  }, [preview?.invoiceLinks]);

  const createRun = useMutation({
    mutationFn: async (args?: { force?: boolean }) =>
      classesApi.createBillingRun({
        month,
        classGroupId: classGroupId === "ALL" ? undefined : classGroupId,
        createInvoices: true,
        sendInvoices: false,
        force: args?.force,
      }),
    onSuccess: async (data) => {
      toast.success(t("classes.billing.invoicesCreated", { count: data.invoiceIds.length }));
      setCreatedCount(data.invoiceIds.length);
      setSendPromptOpen(true);
      setResultSummary(
        t("classes.billing.summaryCreated", { count: data.invoiceIds.length, month })
      );
      await queryClient.invalidateQueries({ queryKey: classBillingKeys.preview(month) });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || t("classes.billing.loadFailed")),
  });

  const sendInvoices = useMutation({
    mutationFn: async () => {
      const runResult = await classesApi.createBillingRun({
        month,
        classGroupId: classGroupId === "ALL" ? undefined : classGroupId,
        createInvoices: false,
        sendInvoices: true,
        idempotencyKey: `classes-billing-send:${month}:${classGroupId}:${Date.now()}`,
      });

      return classesApi.waitForBillingSendCompletionWithSse(runResult.billingRun.id, month, {
        timeoutMs: 90_000,
        intervalMs: 1_500,
        onProgress: (progress) => {
          setSendProgress(progress);
        },
      });
    },
    onMutate: () => {
      setSendProgress(null);
      const toastId = toast.loading(`${t("classes.billing.sendInvoices")}...`);
      return { toastId };
    },
    onSuccess: async (finalPreview, _vars, context) => {
      if (context?.toastId) {
        toast.dismiss(context.toastId);
      }

      const progress = finalPreview.invoiceSendProgress;
      if (progress?.hasFailures) {
        toast.error(t("classes.billing.sendFailed"), {
          description: `${progress.failedCount + progress.bouncedCount} failed, ${
            progress.sentCount + progress.deliveredCount + progress.delayedCount
          } successful`,
        });
      } else {
        toast.success(t("classes.billing.invoicesSent"), {
          description: progress
            ? `${progress.sentCount + progress.deliveredCount + progress.delayedCount}/${
                progress.expectedInvoiceCount
              }`
            : undefined,
        });
      }

      if (progress) {
        setResultSummary(
          `Send result: ${progress.sentCount + progress.deliveredCount + progress.delayedCount}/${
            progress.expectedInvoiceCount
          } successful${progress.hasFailures ? `, ${progress.failedCount + progress.bouncedCount} failed` : ""}`
        );
      }

      setSendProgress(null);
      setSendPromptOpen(false);
      await queryClient.invalidateQueries({ queryKey: classBillingKeys.preview(month) });
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.toastId) {
        toast.dismiss(context.toastId);
      }
      setSendProgress(null);
      toast.error(getErrorMessage(err) || t("classes.billing.sendFailed"));
    },
  });

  return (
    <CrudListPageLayout
      title={t("classes.billing.title")}
      subtitle={t("classes.billing.subtitle")}
      primaryAction={
        <div className="flex items-center gap-2">
          {preview?.billingRunStatus === "INVOICES_CREATED" && (
            <Button
              variant="outline"
              onClick={() => sendInvoices.mutate()}
              disabled={sendInvoices.isPending || !month}
            >
              <Mail className="h-4 w-4" />
              {t("classes.billing.sendInvoices")}
            </Button>
          )}
          {preview?.billingRunStatus === "INVOICES_CREATED" && (
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm(t("classes.billing.regenerateConfirm"))) {
                  createRun.mutate({ force: true });
                }
              }}
              disabled={createRun.isPending || !month}
            >
              <RefreshCcw className="h-4 w-4" />
              {t("classes.billing.regenerate")}
            </Button>
          )}
          <Button
            variant="accent"
            onClick={() => createRun.mutate({})}
            disabled={createRun.isPending || !month}
          >
            <FileText className="h-4 w-4" />
            {t("classes.billing.createInvoices")}
          </Button>
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("classes.billing.billingMonth")}
            </span>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t("classes.billing.classGroup")}
            </span>
            <Select value={classGroupId} onValueChange={setClassGroupId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("classes.billing.selectAllGroups")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("classes.billing.allGroups")}</SelectItem>
                {(groupsData?.items ?? []).map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: classBillingKeys.preview(month, classGroupId),
              })
            }
          >
            <RefreshCcw className="h-4 w-4" />
            {t("classes.billing.refresh")}
          </Button>
        </div>
      }
    >
      <AlertDialog open={sendPromptOpen} onOpenChange={setSendPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("classes.billing.sendDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("classes.billing.sendDialogDescription", { count: createdCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("classes.billing.sendDialogNo")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendInvoices.mutate()}
              disabled={sendInvoices.isPending}
            >
              {t("classes.billing.sendDialogYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 space-y-6">
        {resultSummary ? (
          <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {resultSummary}
          </div>
        ) : null}

        {sendInvoices.isPending && sendProgress ? (
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
              <span className="text-muted-foreground font-medium">
                {t("classes.billing.basis")}
              </span>
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
                      <div className="text-xs mt-0.5">
                        {emailByClient.has(item.payerClientId) ? (
                          emailByClient.get(item.payerClientId) ? (
                            <span className="text-muted-foreground">
                              {emailByClient.get(item.payerClientId)}
                            </span>
                          ) : (
                            <span className="text-destructive font-medium italic">
                              Missing email
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">
                            {t("classes.billing.payerId")} {item.payerClientId}
                          </span>
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
                            (item.lines.length === 1
                              ? invoiceByPayerAndClass.legacyByPayer.get(item.payerClientId)
                              : undefined);
                          const lineInvoiceStatus = lineInvoice?.invoiceStatus ?? null;
                          return (
                            <tr
                              key={line.classGroupId}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-medium">
                                {nameByGroup.get(line.classGroupId) ?? line.classGroupId}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-muted-foreground italic">
                                {line.sessions}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                                {formatMoney(line.priceCents, undefined, item.currency)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold">
                                {formatMoney(line.amountCents, undefined, item.currency)}
                              </td>
                              <td className="px-4 py-3">
                                {lineInvoice ? (
                                  <div className="flex items-center justify-end gap-2">
                                    {lineInvoiceStatus ? (
                                      <Badge
                                        variant="outline"
                                        className={
                                          lineInvoiceStatus === "SENT"
                                            ? "border-green-200 bg-green-50 text-green-700"
                                            : ""
                                        }
                                      >
                                        {lineInvoiceStatus}
                                      </Badge>
                                    ) : null}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openSendDialog(lineInvoice.invoiceId)}
                                      disabled={isFetching}
                                    >
                                      <Mail className="h-4 w-4" />
                                      {t("invoices.actions.send")}
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                      <Link to={`/invoices/${lineInvoice.invoiceId}`}>
                                        {t("classes.billing.viewInvoice")}
                                      </Link>
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-right text-xs text-muted-foreground">
                                    {t("classes.billing.invoiceNotCreated")}
                                  </div>
                                )}
                              </td>
                            </tr>
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
            <h3 className="text-lg font-medium text-foreground">
              {t("classes.billing.emptyTitle")}
            </h3>
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

      {currentInvoice && (
        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          invoice={currentInvoice}
          onSend={handleSendInvoice}
          isSending={isSending}
        />
      )}
    </CrudListPageLayout>
  );
}
