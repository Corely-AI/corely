import React, { useState, useEffect } from "react";
import { type InvoiceDto } from "@corely/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { useTranslation } from "react-i18next";

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceDto;
  onSend: (data: {
    to: string;
    subject: string;
    message: string;
    sendCopy: boolean;
  }) => Promise<void>;
  isSending: boolean;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSend,
  isSending,
}: SendInvoiceDialogProps) {
  const { t } = useTranslation();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && invoice) {
      setTo(invoice.billToEmail || "");
      setSubject(
        t("invoices.email.subject", {
          number: invoice.number ?? "",
          brand: t("common.appName"),
        })
      );
      setMessage("");
    }
  }, [open, invoice, t]);

  const handleSend = () => {
    if (!to) {
      return;
    }
    void onSend({ to, subject, message, sendCopy: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{t("invoices.email.title")}</DialogTitle>
          <DialogDescription>{t("invoices.email.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="to">{t("invoices.email.to")}</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t("invoices.email.toPlaceholder")}
                className="flex-1"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">{t("common.subject")}</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{t("common.message")}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={t("invoices.email.messagePlaceholder")}
              className="resize-none"
            />
          </div>

          {/* Delivery */}
          <div className="space-y-2">
            <Label>{t("invoices.email.deliveryLabel")}</Label>
            <p className="text-sm text-muted-foreground">{t("invoices.email.deliveryHint")}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !to}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isSending ? t("invoices.email.sending") : t("invoices.email.send")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
