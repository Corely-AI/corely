import { useInvoicesApi, useInvoiceKeys } from "../invoice-runtime";
import { useRef, useState } from "react";
import { createIdempotencyKey } from "@corely/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import type { InvoiceDto } from "@corely/contracts";

export function useSendInvoice() {
  const invoicesApi = useInvoicesApi();
  const invoiceQueryKeys = useInvoiceKeys();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceDto | null>(null);
  const sending = useRef(false);
  const deliveryIntents = useRef(new Map<string, string>());

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
    if (!currentInvoice || sending.current) {
      return;
    }

    sending.current = true;
    setIsSending(true);
    const payload = { to: data.to, subject: data.subject, message: data.message, attachPdf: false };
    const fingerprint = JSON.stringify([currentInvoice.id, payload]);
    let idempotencyKey = deliveryIntents.current.get(fingerprint);
    if (!idempotencyKey) {
      idempotencyKey = createIdempotencyKey();
      deliveryIntents.current.set(fingerprint, idempotencyKey);
    }
    try {
      // A previous attempt may have finalized/queued the invoice before its response was lost.
      const latest = await invoicesApi.getInvoice(currentInvoice.id);
      if (latest.invoice.status === "DRAFT") {
        await invoicesApi.finalizeInvoice(currentInvoice.id);
      }
      await invoicesApi.sendInvoice(currentInvoice.id, {
        ...payload,
        idempotencyKey,
      });
      deliveryIntents.current.delete(fingerprint);
      toast.success(t("invoices.email.sent"));
      setIsOpen(false);
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(currentInvoice.id) });
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all() });
    } catch (err) {
      console.error("Failed to send invoice", err);
      toast.error(t("invoices.email.sendFailed"));
    } finally {
      sending.current = false;
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
