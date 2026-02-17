import React from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardCopy, Link2, Mail, MoreHorizontal, RefreshCcw } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@corely/ui";
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
  isMarkSentPending: boolean;
  isShareLinkPending: boolean;
  payerEmail?: string | null;
  privateLink?: string | null;
  onOpenSendDialog: (invoiceId: string) => void;
  onMarkSent: (invoiceId: string) => void;
  onGenerateShareLink: (invoiceId: string) => void;
  onCopyShareLink: (invoiceId: string) => void;
  onRequestRegenerateShareLink: (invoiceId: string) => void;
  sendLabel: string;
  markSentLabel: string;
  generateShareLinkLabel: string;
  copyLinkLabel: string;
  regenerateLinkLabel: string;
  viewInvoiceLabel: string;
  notCreatedLabel: string;
  moreActionsLabel: string;
};

export function ClassBillingLineRow({
  line,
  currency,
  classGroupName,
  lineInvoice,
  isFetching,
  isMarkSentPending,
  isShareLinkPending,
  payerEmail,
  privateLink,
  onOpenSendDialog,
  onMarkSent,
  onGenerateShareLink,
  onCopyShareLink,
  onRequestRegenerateShareLink,
  sendLabel,
  markSentLabel,
  generateShareLinkLabel,
  copyLinkLabel,
  regenerateLinkLabel,
  viewInvoiceLabel,
  notCreatedLabel,
  moreActionsLabel,
}: Props) {
  const lineInvoiceStatus = lineInvoice?.invoiceStatus ?? null;
  const sessions = line.sessions ?? 0;
  const priceCents = line.priceCents ?? 0;
  const amountCents = line.amountCents ?? 0;
  const hasPrivateLink = Boolean(privateLink);

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
              onClick={() =>
                hasPrivateLink
                  ? onCopyShareLink(lineInvoice.invoiceId)
                  : onGenerateShareLink(lineInvoice.invoiceId)
              }
              disabled={isShareLinkPending}
            >
              {hasPrivateLink ? (
                <ClipboardCopy className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {hasPrivateLink ? copyLinkLabel : generateShareLinkLabel}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/invoices/${lineInvoice.invoiceId}`}>{viewInvoiceLabel}</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label={moreActionsLabel}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={() => onOpenSendDialog(lineInvoice.invoiceId)}
                  disabled={isFetching}
                >
                  <Mail className="h-4 w-4" />
                  {sendLabel}
                </DropdownMenuItem>
                {lineInvoiceStatus === "ISSUED" ? (
                  <DropdownMenuItem
                    onSelect={() => onMarkSent(lineInvoice.invoiceId)}
                    disabled={isMarkSentPending || !payerEmail}
                  >
                    <Check className="h-4 w-4" />
                    {markSentLabel}
                  </DropdownMenuItem>
                ) : null}
                {hasPrivateLink ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        onRequestRegenerateShareLink(lineInvoice.invoiceId);
                      }}
                      disabled={isShareLinkPending}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {regenerateLinkLabel}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="text-right text-xs text-muted-foreground">{notCreatedLabel}</div>
        )}
      </td>
    </tr>
  );
}
