import { useInvoicesApi, useInvoiceKeys, useInvoiceNavigate } from "../invoice-runtime";
import { useInvoiceRuntime, useInvoiceDraftGuard } from "../invoice-runtime";
import { flushSync } from "react-dom";
import React, { useState } from "react";

import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { InvoiceFooter } from "../components/InvoiceFooter";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
} from "../schemas/invoice-form.schema";
import type { InvoiceStatus } from "@corely/contracts";

// Sub-components
import { CustomerSelection } from "../components/invoice-form/CustomerSelection";
import { InvoiceMetadata } from "../components/invoice-form/InvoiceMetadata";
import { InvoiceLineItems } from "../components/invoice-form/InvoiceLineItems";
import { InvoiceTotals } from "../components/invoice-form/InvoiceTotals";
import { InvoiceNotes } from "../components/invoice-form/InvoiceNotes";

const FREELANCER_INFO = {
  name: "Manh Ha Doan",
  address: "Wolfsberger Str. 11",
  postalCode: "12623",
  city: "Berlin",
  country: "Germany",
};

import { generateInvoiceNumber } from "../utils/invoice-generators";

const hasFractionalQuantity = (lines: InvoiceFormData["lineItems"]) =>
  lines.some(({ qty }) => Number.isFinite(qty) && !Number.isInteger(qty));

export default function NewInvoicePage() {
  const runtime = useInvoiceRuntime();
  const invoicesApi = useInvoicesApi();
  const invoiceQueryKeys = useInvoiceKeys();
  const { t, i18n } = useTranslation();
  const locale = i18n.t("common.locale");
  const navigate = useInvoiceNavigate();
  const queryClient = useQueryClient();

  const [targetStatus] = useState<InvoiceStatus>("ISSUED");

  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      ...getDefaultInvoiceFormValues(),
      invoiceNumber: generateInvoiceNumber(),
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    watch,
  } = methods;
  useInvoiceDraftGuard("invoice-new", methods.formState.isDirty);
  const savesDraft = hasFractionalQuantity(watch("lineItems"));

  // Submit mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const input = toCreateInvoiceInput(data);
      return invoicesApi.createInvoice(input);
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error(t("common.error"));
    },
  });

  const runStatusFlow = React.useCallback(
    async (
      invoiceId: string,
      currentStatus: InvoiceStatus,
      desiredStatus: InvoiceStatus,
      paymentMethodId?: string
    ) => {
      if (desiredStatus === currentStatus) {
        return currentStatus;
      }

      try {
        if (desiredStatus === "ISSUED") {
          await invoicesApi.finalizeInvoice(invoiceId, paymentMethodId);
          return "ISSUED";
        }
        if (desiredStatus === "SENT") {
          if (currentStatus === "DRAFT") {
            await invoicesApi.finalizeInvoice(invoiceId, paymentMethodId);
          }
          await invoicesApi.sendInvoice(invoiceId);
          return "SENT";
        }
        if (desiredStatus === "CANCELED") {
          await invoicesApi.cancelInvoice(invoiceId, t("invoices.status.cancelReason"));
          return "CANCELED";
        }
        return currentStatus;
      } catch (err) {
        console.error("Status change failed", err);
        toast.error(t("invoices.status.updateFailed"));
        return currentStatus;
      }
    },
    [t]
  );

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const invoice = await createInvoiceMutation.mutateAsync(data);
      const savesDraft = hasFractionalQuantity(data.lineItems);
      const finalStatus = await runStatusFlow(
        invoice.id,
        invoice.status ?? "DRAFT",
        savesDraft ? "DRAFT" : targetStatus,
        data.paymentMethodId
      );
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
      const successMessage = savesDraft
        ? "invoices.fractionalDraftSaved"
        : finalStatus === targetStatus
          ? "invoices.created"
          : "invoices.savedUnchanged";
      toast.success(t(successMessage));
      flushSync(() => {
        methods.reset(data);
        runtime?.registerDraft("invoice-new", false);
      });
      navigate(savesDraft ? `/invoices/${invoice.id}` : "/invoices");
    } catch {
      // handled in mutation callbacks
    }
  };

  return (
    <FormProvider {...methods}>
      <div className={runtime ? "min-w-0 space-y-6" : "p-6 lg:p-8 space-y-6 animate-fade-in"}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-h1 text-foreground">{t("invoices.createNewInvoice")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/invoices")}
              disabled={isSubmitting || createInvoiceMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="accent"
              onClick={handleSubmit(onSubmit)}
              data-testid="submit-invoice-button"
              disabled={isSubmitting || createInvoiceMutation.isPending}
            >
              {isSubmitting || createInvoiceMutation.isPending
                ? t("invoices.creating")
                : savesDraft
                  ? t("invoices.saveFractionalDraft")
                  : t("invoices.createInvoice")}
            </Button>
          </div>
        </div>

        <form data-testid="invoice-form" onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-4 sm:p-8 space-y-8">
              {/* Header with addresses */}
              <div className="space-y-6">
                {/* Your address */}
                <div className="text-sm text-muted-foreground border-b border-dashed border-border pb-4">
                  {runtime ? (
                    runtime.workspace.name
                  ) : (
                    <>
                      {FREELANCER_INFO.name} | {FREELANCER_INFO.address} |{" "}
                      {FREELANCER_INFO.postalCode} {FREELANCER_INFO.city}, {FREELANCER_INFO.country}
                    </>
                  )}
                </div>

                {/* Billed to & Invoice metadata */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left column - Billed to */}
                  <CustomerSelection />

                  {/* Right column - Invoice metadata */}
                  <InvoiceMetadata onGenerateInvoiceNumber={generateInvoiceNumber} />
                </div>
              </div>

              {/* Line items table */}
              <InvoiceLineItems locale={locale} />
              {savesDraft && (
                <p className="text-sm text-muted-foreground">{t("invoices.fractionalDraftHelp")}</p>
              )}

              {/* Notes and Totals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <InvoiceNotes />
                <InvoiceTotals locale={locale} />
              </div>

              {/* Footer */}
              <InvoiceFooter
                paymentMethodId={watch("paymentMethodId")}
                onPaymentMethodSelect={(id) => setValue("paymentMethodId", id)}
              />
            </CardContent>
          </Card>
        </form>
      </div>
    </FormProvider>
  );
}
