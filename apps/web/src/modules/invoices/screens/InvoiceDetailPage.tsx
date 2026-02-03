import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { formatMoney } from "@/shared/lib/formatters";
import { invoicesApi } from "@/lib/invoices-api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
} from "../schemas/invoice-form.schema";
import type { UpdateInvoiceInput } from "@corely/contracts";
import { InvoiceFooter } from "../components/InvoiceFooter";
import { RecordCommandBar } from "@/shared/components/RecordCommandBar";
import { SendInvoiceDialog } from "../components/SendInvoiceDialog";
import { invoiceQueryKeys } from "../queries";
import { generateInvoiceNumber } from "../utils/invoice-generators";

// Sub-components
import {
  CustomerSelection,
  type CustomerOption,
} from "../components/invoice-form/CustomerSelection";
import { InvoiceMetadata } from "../components/invoice-form/InvoiceMetadata";
import { InvoiceLineItems } from "../components/invoice-form/InvoiceLineItems";
import { InvoiceTotals } from "../components/invoice-form/InvoiceTotals";
import { InvoiceNotes } from "../components/invoice-form/InvoiceNotes";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
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
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentNote, setPaymentNote] = useState<string>("");

  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: getDefaultInvoiceFormValues(),
  });

  const { handleSubmit, reset, watch, setValue } = methods;

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

  const downloadPdf = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.downloadInvoicePdf(invoiceId),
    onSuccess: (data) => {
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    },
    onError: (error) => {
      console.error("Download PDF failed", error);
      toast.error(t("invoices.errors.downloadFailed"));
    },
  });

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

  const handleSendInvoice = async (data: {
    to: string;
    subject: string;
    message: string;
    sendCopy: boolean;
  }) => {
    if (!id || !invoice) {
      return;
    }
    setIsProcessing(true);
    try {
      if (invoice.status === "DRAFT") {
        await invoicesApi.finalizeInvoice(id);
      }
      await invoicesApi.sendInvoice(id, {
        to: data.to,
        subject: data.subject,
        message: data.message,
      });
      toast.success(t("invoices.email.sent"));
      setSendDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id ?? "") });
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
    } catch (err) {
      console.error("Failed to send invoice", err);
      toast.error(t("invoices.email.sendFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransition = useCallback(
    async (to: string, input?: Record<string, string>) => {
      if (!id || !invoice) {
        return;
      }

      if (to === "SENT") {
        setSendDialogOpen(true);
        return;
      }

      setIsProcessing(true);
      try {
        if (to === "ISSUED") {
          await invoicesApi.finalizeInvoice(id);
          toast.success("Invoice issued");
        } else if (to === "CANCELED") {
          await invoicesApi.cancelInvoice(id, input?.reason);
          toast.success("Invoice canceled");
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

      if (actionKey === "send") {
        setSendDialogOpen(true);
        return;
      }

      setIsProcessing(true);
      try {
        switch (actionKey) {
          case "issue":
            await invoicesApi.finalizeInvoice(id);
            toast.success("Invoice issued");
            break;
          case "download_pdf":
            downloadPdf.mutate(id);
            return;
          case "record_payment":
            setPaymentDialogOpen(true);
            return;
          case "cancel":
            await invoicesApi.cancelInvoice(id);
            toast.success("Invoice canceled");
            break;
          case "duplicate":
            toast.info("Duplicate feature coming soon");
            return;
          case "export":
            toast.info("Export feature coming soon");
            return;
          case "view_audit":
            navigate(`/audit?entity=invoice&id=${id}`);
            return;
          case "send_reminder":
            toast.info("Reminder feature coming soon");
            return;
        }
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id ?? "") });
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
      } catch (err) {
        console.error("Action failed", err);
        toast.error("Action failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [id, downloadPdf, navigate, queryClient]
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
      toast.success("Invoice updated successfully");
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
      toast.error("Invalid amount");
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
        toast.success("Payment recorded");
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
        {capabilities && (
          <RecordCommandBar
            title={t("invoices.titleWithNumber", {
              number: invoice.number ?? t("common.draft"),
            })}
            subtitle={t("common.createdAt", {
              date: invoice.createdAt
                ? new Date(invoice.createdAt).toLocaleDateString(i18n.language)
                : t("common.empty"),
            })}
            capabilities={capabilities}
            onBack={() => navigate("/invoices")}
            onTransition={handleTransition}
            onAction={handleAction}
            isLoading={isProcessing}
          />
        )}

        {!capabilities && (
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
        )}

        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          invoice={invoice}
          onSend={handleSendInvoice}
          isSending={isProcessing}
        />

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("invoices.payments.recordTitle")}</DialogTitle>
              <DialogDescription>{t("invoices.payments.recordDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">{t("common.amount")}</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("invoices.payments.dueAmount", {
                    amount: formatMoney(
                      invoice.totals?.dueCents ?? 0,
                      i18n.t("common.locale"),
                      invoice.currency
                    ),
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">{t("common.date")}</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-note">{t("common.noteOptional")}</Label>
                <Input
                  id="payment-note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={t("invoices.payments.notePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={recordPayment} disabled={isProcessing}>
                {isProcessing ? t("common.saving") : t("invoices.payments.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
