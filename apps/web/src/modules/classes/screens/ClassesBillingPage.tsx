import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, RefreshCcw } from "lucide-react";
import type { BillingInvoiceSendProgress } from "@corely/contracts";
import {
  Button,
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
import { invoicesApi } from "@/lib/invoices-api";
import { CrudListPageLayout } from "@/shared/crud";
import { classBillingKeys } from "../queries";
import { useSendInvoice } from "../../invoices/hooks/use-send-invoice";
import { SendInvoiceDialog } from "../../invoices/components/SendInvoiceDialog";
import { ClassesBillingContent } from "../components/ClassesBillingContent";
import { ClassesBillingDialogs } from "../components/ClassesBillingDialogs";
import { getBillingErrorMessage } from "../lib/get-billing-error-message";

const toMonthValue = (date: Date) => date.toISOString().slice(0, 7);

export default function ClassesBillingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(toMonthValue(new Date()));
  const [classGroupId, setClassGroupId] = useState<string>("ALL");
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [sendPromptOpen, setSendPromptOpen] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [sendProgress, setSendProgress] = useState<BillingInvoiceSendProgress | null>(null);
  const [regenerateInvoicesConfirmOpen, setRegenerateInvoicesConfirmOpen] = useState(false);
  const [shareLinksByInvoiceId, setShareLinksByInvoiceId] = useState<Record<string, string>>({});
  const [shareLinkPendingInvoiceId, setShareLinkPendingInvoiceId] = useState<string | null>(null);
  const [loadedShareLinkInvoiceIds, setLoadedShareLinkInvoiceIds] = useState<Record<string, true>>(
    {}
  );
  const [regenerateShareTargetInvoiceId, setRegenerateShareTargetInvoiceId] = useState<
    string | null
  >(null);

  const {
    isOpen: sendDialogOpen,
    setIsOpen: setSendDialogOpen,
    isSending,
    isFetching,
    currentInvoice,
    openSendDialog,
    handleSend: handleSendInvoice,
  } = useSendInvoice();

  const shareLink = useMutation({
    mutationFn: async ({ invoiceId, regenerate }: { invoiceId: string; regenerate: boolean }) => {
      setShareLinkPendingInvoiceId(invoiceId);
      return invoicesApi.generateShareLink(invoiceId, { regenerate });
    },
    onSettled: () => setShareLinkPendingInvoiceId(null),
    onSuccess: (data, variables) => {
      setShareLinksByInvoiceId((prev) => ({
        ...prev,
        [variables.invoiceId]: data.url,
      }));
      if (variables.regenerate) {
        toast.success(t("classes.billing.linkRegenerated"));
      }
    },
    onError: () => {
      toast.error(t("classes.billing.linkGenerationFailed"));
    },
  });

  const invalidateMonthPreview = async () => {
    await queryClient.invalidateQueries({ queryKey: classBillingKeys.previewMonth(month) });
  };

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

  const facebookByClient = useMemo(() => {
    const map = new Map<string, string | null>();
    (customersData?.customers ?? []).forEach((customer) => {
      const fb = customer.socialLinks?.find((l) => l.platform === "facebook");
      map.set(customer.id, fb?.url ?? null);
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
      await invalidateMonthPreview();
    },
    onError: (err: unknown) =>
      toast.error(getBillingErrorMessage(err) || t("classes.billing.loadFailed")),
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
      await invalidateMonthPreview();
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.toastId) {
        toast.dismiss(context.toastId);
      }
      setSendProgress(null);
      toast.error(getBillingErrorMessage(err) || t("classes.billing.sendFailed"));
    },
  });

  const markSent = useMutation({
    mutationFn: async ({ invoiceId, to }: { invoiceId: string; to: string }) =>
      invoicesApi.sendInvoice(invoiceId, {
        to,
        attachPdf: false,
      }),
    onSuccess: async () => {
      toast.success(t("classes.billing.markSentSuccess"));
      await invalidateMonthPreview();
    },
    onError: (err: unknown) => {
      toast.error(getBillingErrorMessage(err) || t("classes.billing.markSentFailed"));
    },
  });

  useEffect(() => {
    const invoiceIds = Array.from(
      new Set((preview?.invoiceLinks ?? []).map((link) => link.invoiceId))
    );
    const toLoad = invoiceIds.filter((invoiceId) => !loadedShareLinkInvoiceIds[invoiceId]);
    if (toLoad.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        toLoad.map(async (invoiceId) => {
          try {
            const result = await invoicesApi.getShareLink(invoiceId);
            return { invoiceId, url: result.url };
          } catch {
            return { invoiceId, url: null as string | null };
          }
        })
      );
      if (cancelled) {
        return;
      }

      setLoadedShareLinkInvoiceIds((prev) => {
        const next = { ...prev };
        toLoad.forEach((invoiceId) => {
          next[invoiceId] = true;
        });
        return next;
      });

      setShareLinksByInvoiceId((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          if (row.url) {
            next[row.invoiceId] = row.url;
          }
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [loadedShareLinkInvoiceIds, preview?.invoiceLinks]);

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
          {preview?.billingRunStatus === "INVOICES_CREATED" && classGroupId === "ALL" && (
            <Button
              variant="outline"
              onClick={() => setRegenerateInvoicesConfirmOpen(true)}
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
      <ClassesBillingDialogs
        sendPromptOpen={sendPromptOpen}
        onSendPromptOpenChange={setSendPromptOpen}
        createdCount={createdCount}
        isSendingInvoices={sendInvoices.isPending}
        onConfirmSendInvoices={() => sendInvoices.mutate()}
        regenerateInvoicesConfirmOpen={regenerateInvoicesConfirmOpen}
        onRegenerateInvoicesConfirmOpenChange={setRegenerateInvoicesConfirmOpen}
        onConfirmRegenerateInvoices={() => createRun.mutate({ force: true })}
        isRegenerateInvoicesPending={createRun.isPending}
        regenerateShareTargetInvoiceId={regenerateShareTargetInvoiceId}
        onRegenerateShareTargetInvoiceIdChange={setRegenerateShareTargetInvoiceId}
        onConfirmRegenerateShareLink={(invoiceId) => {
          shareLink.mutate({ invoiceId, regenerate: true });
        }}
      />

      <ClassesBillingContent
        resultSummary={resultSummary}
        isSendingInvoices={sendInvoices.isPending}
        sendProgress={sendProgress}
        preview={preview}
        isLoading={isLoading}
        isError={isError}
        error={error}
        nameByClient={nameByClient}
        emailByClient={emailByClient}
        facebookByClient={facebookByClient}
        nameByGroup={nameByGroup}
        invoiceByPayerAndClass={invoiceByPayerAndClass}
        classGroupId={classGroupId}
        isFetching={isFetching}
        isMarkSentPending={markSent.isPending}
        shareLinkPendingInvoiceId={shareLinkPendingInvoiceId}
        shareLinksByInvoiceId={shareLinksByInvoiceId}
        onOpenSendDialog={openSendDialog}
        onMarkSent={(invoiceId, payerClientId) => {
          const payerEmail = emailByClient.get(payerClientId);
          if (!payerEmail) {
            toast.error(t("classes.billing.customerEmailRequired"));
            return;
          }
          markSent.mutate({ invoiceId, to: payerEmail });
        }}
        onGenerateShareLink={(invoiceId) => {
          shareLink.mutate({ invoiceId, regenerate: false });
        }}
        onCopyShareLink={async (invoiceId) => {
          const url = shareLinksByInvoiceId[invoiceId];
          if (!url) {
            return;
          }
          try {
            await navigator.clipboard.writeText(url);
            toast.success(t("classes.billing.copyLinkSuccess"));
          } catch {
            toast.error(t("classes.billing.copyLinkFailed"));
          }
        }}
        onRequestRegenerateShareLink={(invoiceId) => {
          setRegenerateShareTargetInvoiceId(invoiceId);
        }}
      />

      {currentInvoice && (
        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          invoice={currentInvoice}
          onSend={async (data) => {
            await handleSendInvoice(data);
            await invalidateMonthPreview();
          }}
          isSending={isSending}
        />
      )}
    </CrudListPageLayout>
  );
}
