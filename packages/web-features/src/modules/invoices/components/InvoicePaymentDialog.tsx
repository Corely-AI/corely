import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@corely/ui";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAmount: string;
  paymentDate: string;
  paymentNote: string;
  onPaymentAmountChange: (value: string) => void;
  onPaymentDateChange: (value: string) => void;
  onPaymentNoteChange: (value: string) => void;
  onSave: () => void;
  isProcessing: boolean;
  dueCents: number;
  locale: string;
  currency: string;
};

export function InvoicePaymentDialog({
  open,
  onOpenChange,
  paymentAmount,
  paymentDate,
  paymentNote,
  onPaymentAmountChange,
  onPaymentDateChange,
  onPaymentNoteChange,
  onSave,
  isProcessing,
  dueCents,
  locale,
  currency,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onPaymentAmountChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("invoices.payments.dueAmount", {
                amount: formatMoney(dueCents, locale, currency),
              })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">{t("common.date")}</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => onPaymentDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-note">{t("common.noteOptional")}</Label>
            <Input
              id="payment-note"
              value={paymentNote}
              onChange={(e) => onPaymentNoteChange(e.target.value)}
              placeholder={t("invoices.payments.notePlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSave} disabled={isProcessing}>
            {isProcessing ? t("common.saving") : t("invoices.payments.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
