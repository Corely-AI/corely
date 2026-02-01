import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { invoicesApi } from "@/lib/invoices-api";
import { InvoiceFooter } from "../components/InvoiceFooter";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
} from "../schemas/invoice-form.schema";
import type { InvoiceStatus } from "@corely/contracts";
import { invoiceQueryKeys } from "../queries";

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

export default function NewInvoicePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const navigate = useNavigate();
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
          await invoicesApi.cancelInvoice(invoiceId, "Canceled from form");
          return "CANCELED";
        }
        return currentStatus;
      } catch (err) {
        console.error("Status change failed", err);
        toast.error("Could not update invoice status");
        return currentStatus;
      }
    },
    []
  );

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const invoice = await createInvoiceMutation.mutateAsync(data);
      const finalStatus = await runStatusFlow(
        invoice.id,
        invoice.status ?? "DRAFT",
        targetStatus,
        data.paymentMethodId
      );
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
      toast.success(
        finalStatus === targetStatus ? t("invoices.created") : "Invoice saved (status unchanged)"
      );
      navigate("/invoices");
    } catch {
      // handled in mutation callbacks
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
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
                : t("invoices.createInvoice")}
            </Button>
          </div>
        </div>

        <form data-testid="invoice-form" onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8 space-y-8">
              {/* Header with addresses */}
              <div className="space-y-6">
                {/* Your address */}
                <div className="text-sm text-muted-foreground border-b border-dashed border-border pb-4">
                  {FREELANCER_INFO.name} | {FREELANCER_INFO.address} | {FREELANCER_INFO.postalCode}{" "}
                  {FREELANCER_INFO.city}, {FREELANCER_INFO.country}
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
