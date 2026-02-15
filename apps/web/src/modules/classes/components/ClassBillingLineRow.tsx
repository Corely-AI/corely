import React from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Badge, Button } from "@corely/ui";
import { formatMoney } from "@/shared/lib/formatters";

type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED" | null;

type LineInvoice = {
  invoiceId: string;
  invoiceStatus: InvoiceStatus;
};

type BillingLine = {
  classGroupId?: string;
  sessions?: number;
  priceCents?: number;
  amountCents?: number;
};

type Props = {
  line: BillingLine;
  currency: string;
  classGroupName: string;
  lineInvoice?: LineInvoice;
  isFetching: boolean;
  onOpenSendDialog: (invoiceId: string) => void;
  sendLabel: string;
  viewInvoiceLabel: string;
  notCreatedLabel: string;
};

export function ClassBillingLineRow({
  line,
  currency,
  classGroupName,
  lineInvoice,
  isFetching,
  onOpenSendDialog,
  sendLabel,
  viewInvoiceLabel,
  notCreatedLabel,
}: Props) {
  const lineInvoiceStatus = lineInvoice?.invoiceStatus ?? null;
  const sessions = line.sessions ?? 0;
  const priceCents = line.priceCents ?? 0;
  const amountCents = line.amountCents ?? 0;

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-sm font-medium">{classGroupName}</td>
      <td className="px-4 py-3 text-sm text-center text-muted-foreground italic">{sessions}</td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">
        {formatMoney(priceCents, undefined, currency)}
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold">
        {formatMoney(amountCents, undefined, currency)}
      </td>
      <td className="px-4 py-3">
        {lineInvoice ? (
          <div className="flex items-center justify-end gap-2">
            {lineInvoiceStatus ? (
              <Badge
                variant="outline"
                className={
                  lineInvoiceStatus === "SENT" ? "border-green-200 bg-green-50 text-green-700" : ""
                }
              >
                {lineInvoiceStatus}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenSendDialog(lineInvoice.invoiceId)}
              disabled={isFetching}
            >
              <Mail className="h-4 w-4" />
              {sendLabel}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/invoices/${lineInvoice.invoiceId}`}>{viewInvoiceLabel}</Link>
            </Button>
          </div>
        ) : (
          <div className="text-right text-xs text-muted-foreground">{notCreatedLabel}</div>
        )}
      </td>
    </tr>
  );
}
