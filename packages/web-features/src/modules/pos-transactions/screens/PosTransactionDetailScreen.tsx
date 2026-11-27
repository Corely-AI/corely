import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LoadingSkeleton,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@corely/ui";
import { posTransactionsApi } from "@corely/web-shared/lib/pos-transactions-api";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { DetailScreenHeader } from "@corely/web-shared/shared/components/DetailScreenHeader";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { posTransactionKeys } from "../queries";

const toIsoString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value;

const formatTimestamp = (value: string | Date): string => formatDateTime(toIsoString(value));

const statusTone = (status: string): "default" | "secondary" | "destructive" => {
  if (status === "SYNCED") {
    return "default";
  }

  if (status === "FAILED") {
    return "destructive";
  }

  return "secondary";
};

export function PosTransactionDetailScreen() {
  const uiCopy = useUiCopy("ui.pos-transactions-postransactiondetailscreen");
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  const transactionQuery = useQuery({
    queryKey: posTransactionKeys.detail(transactionId),
    queryFn: () =>
      transactionId
        ? posTransactionsApi.getTransaction(transactionId)
        : Promise.reject(new Error("Missing transaction id")),
    enabled: Boolean(transactionId),
    retry: false,
  });

  if (!transactionId) {
    return null;
  }

  if (transactionQuery.isLoading) {
    return (
      <LoadingSkeleton
        variant="detail"
        label={uiCopy("loading-transaction-detail")}
        className="p-6 lg:p-8"
        withHeading
      />
    );
  }

  if (transactionQuery.isError || !transactionQuery.data) {
    return (
      <div className="p-6">
        <EmptyState
          title={uiCopy("transaction-not-available")}
          description={uiCopy("the-synced-pos-transaction")}
        />
      </div>
    );
  }

  const transaction = transactionQuery.data.transaction;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <DetailScreenHeader
        title={transaction.receiptNumber}
        subtitle={`${transaction.registerName ?? transaction.registerId} · ${formatTimestamp(transaction.saleDate)}`}
        capabilities={{
          status: {
            value: transaction.status,
            label: transaction.status,
          },
        }}
        onBack={() => navigate("/pos/admin/transactions")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{uiCopy("totals")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{uiCopy("subtotal")}</span>
              <span>{formatMoney(transaction.subtotalCents, undefined, transaction.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{uiCopy("tax")}</span>
              <span>{formatMoney(transaction.taxCents, undefined, transaction.currency)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 font-medium">
              <span>{uiCopy("total")}</span>
              <span>{formatMoney(transaction.totalCents, undefined, transaction.currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{uiCopy("transaction")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">{uiCopy("transaction-id")}</div>
              <div className="break-all">{transaction.transactionId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("status")}</div>
              <Badge variant={statusTone(transaction.status)}>{transaction.status}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("cashier")}</div>
              <div className="break-all">{transaction.cashierEmployeePartyId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("session")}</div>
              <div>{transaction.sessionId ?? uiCopy("no-linked-session")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{uiCopy("sync-metadata")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">{uiCopy("receipt")}</div>
              <div>{transaction.receiptNumber}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("synced-at")}</div>
              <div>{formatTimestamp(transaction.syncedAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("invoice")}</div>
              <div>{transaction.serverInvoiceId ?? uiCopy("not-linked-yet")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("payment")}</div>
              <div>{transaction.serverPaymentId ?? uiCopy("not-linked-yet")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{uiCopy("idempotency-key")}</div>
              <div className="break-all">{transaction.idempotencyKey}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{uiCopy("payments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("method")}</TableHead>
                <TableHead>{uiCopy("reference")}</TableHead>
                <TableHead className="text-right">{uiCopy("amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.payments.map((payment) => (
                <TableRow key={payment.paymentId}>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>{payment.reference ?? uiCopy("no-reference")}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(payment.amountCents, undefined, transaction.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{uiCopy("line-items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("product")}</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">{uiCopy("qty")}</TableHead>
                <TableHead className="text-right">{uiCopy("unit-price")}</TableHead>
                <TableHead className="text-right">{uiCopy("discount")}</TableHead>
                <TableHead className="text-right">{uiCopy("line-total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.lineItems.map((lineItem) => (
                <TableRow key={lineItem.lineItemId}>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{lineItem.productName}</div>
                      <div className="text-xs text-muted-foreground">{lineItem.productId}</div>
                    </div>
                  </TableCell>
                  <TableCell>{lineItem.sku}</TableCell>
                  <TableCell className="text-right">{lineItem.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(lineItem.unitPriceCents, undefined, transaction.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(lineItem.discountCents, undefined, transaction.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(lineItem.lineTotalCents, undefined, transaction.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
