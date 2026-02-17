import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { invoicesApi } from "@/lib/invoices-api";
import { invoiceQueryKeys } from "../queries";
import type { InvoiceDto } from "@corely/contracts";

export function useSendInvoice() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceDto | null>(null);

  const openSendDialog = async (invoiceOrId: InvoiceDto | string) => {
    if (typeof invoiceOrId === "string") {
      setIsFetching(true);
      try {
        const data = await invoicesApi.getInvoice(invoiceOrId);
        setCurrentInvoice(data.invoice);
        setIsOpen(true);
      } catch (err) {
        console.error("Failed to fetch invoice for sending", err);
        toast.error(t("invoices.errors.actionFailed"));
      } finally {
        setIsFetching(false);
      }
    } else {
      setCurrentInvoice(invoiceOrId);
      setIsOpen(true);
    }
  };

  const handleSend = async (data: {
    to: string;
    subject: string;
    message: string;
    sendCopy: boolean;
  }) => {
    if (!currentInvoice) {
      return;
    }

    setIsSending(true);
    try {
      if (currentInvoice.status === "DRAFT") {
        await invoicesApi.finalizeInvoice(currentInvoice.id);
      }
      await invoicesApi.sendInvoice(currentInvoice.id, {
        to: data.to,
        subject: data.subject,
        message: data.message,
        attachPdf: false,
      });
      toast.success(t("invoices.email.sent"));
      setIsOpen(false);
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(currentInvoice.id) });
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
    } catch (err) {
      console.error("Failed to send invoice", err);
      toast.error(t("invoices.email.sendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    isSending,
    isFetching,
    currentInvoice,
    openSendDialog,
    handleSend,
  };
}
