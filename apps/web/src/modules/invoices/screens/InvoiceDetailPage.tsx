import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { formatMoney } from "@/shared/lib/formatters";
import { invoicesApi } from "@/lib/invoices-api";
import { paymentMethodsApi } from "@/lib/payment-methods-api";
import { toast } from "sonner";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
} from "../schemas/invoice-form.schema";
import type { InvoiceEmailDraftLanguage, UpdateInvoiceInput } from "@corely/contracts";
import { InvoiceFooter } from "../components/InvoiceFooter";
import { SendInvoiceDialog } from "../components/SendInvoiceDialog";
import { InvoicePaymentDialog } from "../components/InvoicePaymentDialog";
import { InvoiceDetailHeader } from "../components/InvoiceDetailHeader";
import { InvoiceCopilotPanel } from "../components/InvoiceCopilotPanel";
import { invoiceQueryKeys } from "../queries";
import { generateInvoiceNumber } from "../utils/invoice-generators";
import { useSendInvoice } from "../hooks/use-send-invoice";

// Sub-components
import {
  CustomerSelection,
  type CustomerOption,
} from "../components/invoice-form/CustomerSelection";
import { InvoiceMetadata } from "../components/invoice-form/InvoiceMetadata";
import { InvoiceLineItems } from "../components/invoice-form/InvoiceLineItems";
import { InvoiceTotals } from "../components/invoice-form/InvoiceTotals";
import { InvoiceNotes } from "../components/invoice-form/InvoiceNotes";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export default function InvoiceDetailPage() {
  const PDF_WAIT_PER_REQUEST_MS = 15000;
  const PDF_MAX_WAIT_TOTAL_MS = 90000;
  const PDF_RETRY_AFTER_MIN_MS = 500;
  const PDF_RETRY_AFTER_MAX_MS = 5000;
  const PDF_DEBUG = import.meta.env.DEV;

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { activeWorkspace } = useWorkspace();
  const locale = i18n.t("common.locale");

  const {
    data: invoiceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: invoiceQueryKeys.detail(id ?? ""),
    queryFn: () => (id ? invoicesApi.getInvoice(id) : Promise.reject("Missing id")),
    enabled: Boolean(id),
  });

  const invoice = invoiceData?.invoice;
  const capabilities = invoiceData?.capabilities;

  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isOpen: sendDialogOpen,
    setIsOpen: setSendDialogOpen,
    isSending,
    currentInvoice,
    openSendDialog,
    handleSend: handleSendInvoice,
  } = useSendInvoice();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentNote, setPaymentNote] = useState<string>("");
  const downloadAbortRef = useRef<AbortController | null>(null);
  const downloadInFlightRef = useRef(false);

  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: getDefaultInvoiceFormValues(),
  });

  const { handleSubmit, reset, watch, setValue, getValues } = methods;
  const defaultCopilotLanguage = useMemo<InvoiceEmailDraftLanguage>(() => {
    const language = i18n.resolvedLanguage ?? i18n.language;
    if (language?.startsWith("de")) {
      return "de";
    }
    if (language?.startsWith("vi")) {
      return "vi";
    }
    return "en";
  }, [i18n.language, i18n.resolvedLanguage]);

  // Prepare additional customer options from invoice data
  const additionalCustomerOptions = useMemo<CustomerOption[]>(() => {
    const list: CustomerOption[] = [];
    if (!invoice) {
      return list;
    }

    if (invoice.customer) {
      list.push({
        id: invoice.customer.id,
        displayName: invoice.customer.displayName,
        billingAddress: invoice.customer.billingAddress,
        email: invoice.customer.email,
        vatId: invoice.customer.vatId,
      });
    }

    if (
      invoice.customerPartyId &&
      (!invoice.customer || invoice.customer.id !== invoice.customerPartyId)
    ) {
      // Fallback for when we have an ID but no embedded customer object matching it perfectly,
      // or simply to ensure the current invoice's BillTo details are available as an option
      const addressLine1 = invoice.billToAddressLine1 ?? undefined;
      const city = invoice.billToCity ?? undefined;
      const country = invoice.billToCountry ?? undefined;

      list.push({
        id: invoice.customerPartyId,
        displayName: invoice.billToName ?? t("customers.unknown"),
        billingAddress:
          addressLine1 || city || country ? { line1: addressLine1, city, country } : undefined,
      });
    }
    return list;
  }, [invoice]);

  useEffect(() => {
    if (!invoice) {
      return;
    }
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
    const seededLines =
      invoice.lineItems.length > 0
        ? invoice.lineItems.map((line) => ({
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
            unit: "h",
          }))
        : getDefaultInvoiceFormValues().lineItems || [];

    reset({
      ...getDefaultInvoiceFormValues(),
      invoiceNumber: invoice.number ?? "",
      customerPartyId: invoice.customerPartyId,
      currency: invoice.currency,
      notes: invoice.notes ?? undefined,
      terms: invoice.terms ?? undefined,
      invoiceDate,
      dueDate,
      vatRate: 19, // Default, TODO: derive from invoice totals if possible or store in backend
      lineItems: seededLines,
      paymentMethodId: invoice.paymentMethodId ?? undefined,
    });
    const due = invoice.totals?.dueCents ?? 0;
    setPaymentAmount(due > 0 ? (due / 100).toFixed(2) : "");
  }, [invoice, reset]);

  const waitWithAbort = useCallback(async (ms: number, signal: AbortSignal) => {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
        resolve();
      };

      signal.addEventListener("abort", onAbort, { once: true });
    });
  }, []);

  const logPdfDebug = useCallback(
    (message: string, meta?: Record<string, unknown>) => {
      if (!PDF_DEBUG) {
        return;
      }
      if (meta) {
        console.debug(`[InvoicePDF] ${message}`, meta);
      } else {
        console.debug(`[InvoicePDF] ${message}`);
      }
    },
    [PDF_DEBUG]
  );

  const ensureInvoicePdfDefaults = useCallback(async () => {
    if (!id || !invoice || invoice.status !== "DRAFT") {
      return;
    }

    const legalEntityId = invoice.legalEntityId ?? activeWorkspace?.legalEntityId;

    let paymentMethodId = getValues("paymentMethodId") ?? invoice.paymentMethodId ?? undefined;
    if (!paymentMethodId && legalEntityId) {
      const paymentMethods = await paymentMethodsApi.listPaymentMethods(legalEntityId);
      const selected =
        paymentMethods.paymentMethods.find((method) => method.isDefaultForInvoicing) ??
        paymentMethods.paymentMethods[0];
      paymentMethodId = selected?.id;
      if (paymentMethodId) {
        setValue("paymentMethodId", paymentMethodId, { shouldDirty: true });
      }
    }

    const headerPatch: UpdateInvoiceInput["headerPatch"] = {};
    if (legalEntityId) {
      headerPatch.legalEntityId = legalEntityId;
    }
    if (paymentMethodId) {
      headerPatch.paymentMethodId = paymentMethodId;
    }

    if (Object.keys(headerPatch).length === 0) {
      return;
    }

    logPdfDebug("Applying invoice PDF defaults before generation", {
      invoiceId: id,
      legalEntityId: headerPatch.legalEntityId,
      paymentMethodId: headerPatch.paymentMethodId,
    });

    await invoicesApi.updateInvoice(id, { headerPatch });
    await queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id) });
  }, [activeWorkspace?.legalEntityId, getValues, id, invoice, logPdfDebug, queryClient, setValue]);

  const downloadPdfWithWait = useCallback(
    async (invoiceId: string, options?: { forceRegenerate?: boolean }) => {
      if (downloadInFlightRef.current) {
        const activeAbort = downloadAbortRef.current;
        if (!activeAbort || activeAbort.signal.aborted) {
          logPdfDebug("Detected stale in-flight lock, resetting", {
            invoiceId,
            hasAbortController: Boolean(activeAbort),
            aborted: activeAbort?.signal.aborted ?? null,
          });
          downloadInFlightRef.current = false;
          downloadAbortRef.current = null;
        }
      }

      if (downloadInFlightRef.current) {
        logPdfDebug("Skip duplicate click while download is in-flight", { invoiceId });
        return;
      }

      downloadInFlightRef.current = true;
      const abortController = new AbortController();
      downloadAbortRef.current = abortController;
      const loadingToastId = toast.loading(t("invoices.pdf.pendingTitle"), {
        description: t("invoices.pdf.pendingDescription"),
      });

      try {
        const startedAt = Date.now();
        let forceRegenerate = options?.forceRegenerate === true;
        logPdfDebug("Download flow started", {
          invoiceId,
          maxWaitMs: PDF_MAX_WAIT_TOTAL_MS,
          perRequestWaitMs: PDF_WAIT_PER_REQUEST_MS,
          forceRegenerate,
        });

        while (Date.now() - startedAt < PDF_MAX_WAIT_TOTAL_MS) {
          const elapsedMs = Date.now() - startedAt;
          const remainingMs = PDF_MAX_WAIT_TOTAL_MS - elapsedMs;
          const waitMs = Math.min(PDF_WAIT_PER_REQUEST_MS, remainingMs);
          logPdfDebug("Requesting invoice PDF", { invoiceId, elapsedMs, remainingMs, waitMs });

          const response = await invoicesApi.downloadInvoicePdf(invoiceId, {
            waitMs,
            signal: abortController.signal,
            forceRegenerate,
          });
          forceRegenerate = false;
          logPdfDebug("Received invoice PDF response", {
            invoiceId,
            status: response.status,
            retryAfterMs: response.retryAfterMs,
            hasDownloadUrl: Boolean(response.downloadUrl),
          });

          if (response.status === "READY" && response.downloadUrl) {
            logPdfDebug("PDF is ready, opening URL", {
              invoiceId,
              downloadUrl: response.downloadUrl,
            });
            const opened = window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
            if (!opened) {
              logPdfDebug("Popup likely blocked while opening PDF", { invoiceId });
              toast.error(t("invoices.errors.downloadFailed"), {
                description: "Please allow pop-ups for this site and try again.",
              });
            }
            return;
          }

          const retryAfterMs = Math.max(
            PDF_RETRY_AFTER_MIN_MS,
            Math.min(PDF_RETRY_AFTER_MAX_MS, response.retryAfterMs ?? 1000)
          );
          logPdfDebug("PDF still pending, waiting before retry", {
            invoiceId,
            retryAfterMs,
          });
          await waitWithAbort(retryAfterMs, abortController.signal);
        }

        logPdfDebug("Download flow timed out", { invoiceId, maxWaitMs: PDF_MAX_WAIT_TOTAL_MS });
        toast.info(t("invoices.pdf.stillGeneratingTitle"), {
          description: t("invoices.pdf.stillGeneratingDescription"),
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          logPdfDebug("Download flow aborted", { invoiceId });
          return;
        }
        const details =
          typeof error === "object" &&
          error !== null &&
          "body" in error &&
          typeof (error as { body?: { message?: string } }).body?.message === "string"
            ? (error as { body: { message: string } }).body.message
            : undefined;
        logPdfDebug("Download flow failed", {
          invoiceId,
          details,
          error,
        });
        console.error("Download PDF failed", error);
        toast.error(t("invoices.errors.downloadFailed"), {
          description: details,
        });
      } finally {
        toast.dismiss(loadingToastId);
        if (downloadAbortRef.current === abortController) {
          downloadAbortRef.current = null;
        }
        downloadInFlightRef.current = false;
        logPdfDebug("Download flow finished", { invoiceId });
      }
    },
    [logPdfDebug, t, waitWithAbort]
  );

  useEffect(() => {
    return () => {
      downloadAbortRef.current?.abort();
      logPdfDebug("Aborted download flow on unmount");
      downloadAbortRef.current = null;
      downloadInFlightRef.current = false;
    };
  }, [logPdfDebug]);

  const updateInvoice = useMutation({
    mutationFn: async (payload: Omit<UpdateInvoiceInput, "invoiceId">) => {
      if (!id) {
        throw new Error("Missing invoice id");
      }
      return invoicesApi.updateInvoice(id, payload);
    },
    onError: (err) => {
      console.error("Update invoice failed", err);
      toast.error(t("invoices.errors.updateFailed"));
    },
  });

  const handleTransition = useCallback(
    async (to: string, input?: Record<string, string>) => {
      if (!id || !invoice) {
        return;
      }

      if (to === "SENT") {
        void openSendDialog(invoice);
        return;
      }

      setIsProcessing(true);
      try {
        if (to === "ISSUED") {
          await invoicesApi.finalizeInvoice(id);
          toast.success(t("invoices.issued"));
        } else if (to === "CANCELED") {
          await invoicesApi.cancelInvoice(id, input?.reason);
          toast.success(t("invoices.canceled"));
        }
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id ?? "") });
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
      } catch (err) {
        console.error("Transition failed", err);
        toast.error(t("invoices.status.updateFailed"));
      } finally {
        setIsProcessing(false);
      }
    },
    [id, invoice, queryClient]
  );

  const handleAction = useCallback(
    async (actionKey: string) => {
      if (!id) {
        return;
      }

      if (actionKey === "send" || actionKey === "resend") {
        void openSendDialog(invoice);
        return;
      }
      logPdfDebug("Invoice header action clicked", { actionKey, invoiceId: id });

      setIsProcessing(true);
      try {
        switch (actionKey) {
          case "issue":
            await invoicesApi.finalizeInvoice(id);
            toast.success(t("invoices.issued"));
            break;
          case "download_pdf":
          case "download-pdf":
          case "downloadPdf":
            await ensureInvoicePdfDefaults();
            if (invoice?.status === "DRAFT") {
              await invoicesApi.finalizeInvoice(id);
              toast.success(t("invoices.issued"));
              await queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id) });
              await queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
            }
            await downloadPdfWithWait(id, { forceRegenerate: true });
            return;
          case "record_payment":
            setPaymentDialogOpen(true);
            return;
          case "cancel":
            await invoicesApi.cancelInvoice(id);
            toast.success(t("invoices.notifications.canceled"));
            break;
          case "duplicate":
            toast.info(t("invoices.notifications.duplicateSoon"));
            return;
          case "export":
            toast.info(t("invoices.notifications.exportSoon"));
            return;
          case "view_audit":
            navigate(`/audit?entity=invoice&id=${id}`);
            return;
          case "send_reminder":
            toast.info(t("invoices.notifications.reminderSoon"));
            return;
        }
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id ?? "") });
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
      } catch (err) {
        console.error("Action failed", err);
        toast.error(t("invoices.errors.actionFailed"));
      } finally {
        setIsProcessing(false);
      }
    },
    [downloadPdfWithWait, ensureInvoicePdfDefaults, id, invoice?.status, navigate, queryClient, t]
  );

  const onFormSubmit = async (data: InvoiceFormData) => {
    if (!id || !invoice) {
      return;
    }
    try {
      const createInput = toCreateInvoiceInput(data);
      const isDraft = invoice.status === "DRAFT";
      const headerPatch: UpdateInvoiceInput["headerPatch"] = {
        notes: createInput.notes,
        terms: createInput.terms,
      };

      if (isDraft) {
        headerPatch.customerPartyId = createInput.customerPartyId;
        headerPatch.currency = createInput.currency;
        headerPatch.invoiceDate = createInput.invoiceDate;
        headerPatch.dueDate = createInput.dueDate;
        headerPatch.paymentMethodId = createInput.paymentMethodId;
      }

      const updateInput: Omit<UpdateInvoiceInput, "invoiceId"> = {
        headerPatch,
        ...(isDraft ? { lineItems: createInput.lineItems } : {}),
      };

      await updateInvoice.mutateAsync(updateInput);
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id ?? "") });
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
      toast.success(t("invoices.updated"));
      navigate("/invoices");
    } catch {
      // errors handled by mutation
    }
  };

  const recordPayment = () => {
    if (!id) {
      return;
    }
    const amountCents = Math.round(parseFloat(paymentAmount || "0") * 100);
    if (!amountCents || Number.isNaN(amountCents)) {
      toast.error(t("invoices.errors.invalidAmount"));
      return;
    }
    setIsProcessing(true);
    invoicesApi
      .recordPayment({
        invoiceId: id,
        amountCents,
        paidAt: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        note: paymentNote || undefined,
      })
      .then(() => {
        setPaymentDialogOpen(false);
        setPaymentNote("");
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id ?? "") });
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
        toast.success(t("common.success"));
      })
      .catch((err) => {
        console.error("Record payment failed", err);
        toast.error(t("invoices.payments.recordFailed"));
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("invoices.loading")}
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
              <span className="text-lg">←</span>
            </Button>
            <h1 className="text-h2 text-foreground">{t("invoices.notFound")}</h1>
          </div>
          <Button variant="accent" onClick={() => navigate("/invoices")}>
            {t("invoices.backToList")}
          </Button>
        </div>
        <p className="text-muted-foreground">{t("invoices.notFoundDescription")}</p>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <InvoiceDetailHeader
          invoice={invoice}
          capabilities={capabilities}
          isProcessing={isProcessing}
          onTransition={handleTransition}
          onAction={handleAction}
        />

        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          invoice={currentInvoice || (invoice as any)}
          onSend={handleSendInvoice}
          isSending={isSending}
        />

        <InvoicePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          paymentAmount={paymentAmount}
          paymentDate={paymentDate}
          paymentNote={paymentNote}
          onPaymentAmountChange={setPaymentAmount}
          onPaymentDateChange={setPaymentDate}
          onPaymentNoteChange={setPaymentNote}
          onSave={recordPayment}
          isProcessing={isProcessing}
          dueCents={invoice.totals?.dueCents ?? 0}
          locale={i18n.t("common.locale")}
          currency={invoice.currency}
        />

        <InvoiceCopilotPanel
          invoiceId={invoice.id}
          invoiceStatus={invoice.status}
          amountDueCents={invoice.totals?.dueCents ?? 0}
          defaultLanguage={defaultCopilotLanguage}
        />

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Selection */}
                <CustomerSelection additionalOptions={additionalCustomerOptions} />

                {/* Invoice Metadata */}
                <InvoiceMetadata onGenerateInvoiceNumber={generateInvoiceNumber} />
              </div>

              {/* Line Items */}
              <InvoiceLineItems locale={locale} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Notes */}
                <InvoiceNotes />
                {/* Totals */}
                <InvoiceTotals locale={locale} />
              </div>

              {/* Footer */}
              <InvoiceFooter
                legalEntityId={invoice.legalEntityId}
                paymentMethodId={watch("paymentMethodId")}
                onPaymentMethodSelect={(id) => setValue("paymentMethodId", id)}
              />

              <div className="flex justify-end pt-6 border-t border-border">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={updateInvoice.isPending || isProcessing}
                >
                  {updateInvoice.isPending ? t("common.saving") : t("common.saveChanges")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </FormProvider>
  );
}
