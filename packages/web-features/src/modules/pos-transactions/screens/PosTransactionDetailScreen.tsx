import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
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
    return <div className="p-6 text-sm text-muted-foreground">Loading transaction detail...</div>;
  }

  if (transactionQuery.isError || !transactionQuery.data) {
    return (
      <div className="p-6">
        <EmptyState
          title="Transaction not available"
          description="The synced POS transaction could not be loaded from the current workspace."
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
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(transaction.subtotalCents, undefined, transaction.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(transaction.taxCents, undefined, transaction.currency)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 font-medium">
              <span>Total</span>
              <span>{formatMoney(transaction.totalCents, undefined, transaction.currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Transaction ID</div>
              <div className="break-all">{transaction.transactionId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <Badge variant={statusTone(transaction.status)}>{transaction.status}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">Cashier</div>
              <div className="break-all">{transaction.cashierEmployeePartyId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Session</div>
              <div>{transaction.sessionId ?? "No linked session"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Receipt</div>
              <div>{transaction.receiptNumber}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Synced at</div>
              <div>{formatTimestamp(transaction.syncedAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Invoice</div>
              <div>{transaction.serverInvoiceId ?? "Not linked yet"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Payment</div>
              <div>{transaction.serverPaymentId ?? "Not linked yet"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Idempotency key</div>
              <div className="break-all">{transaction.idempotencyKey}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.payments.map((payment) => (
                <TableRow key={payment.paymentId}>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>{payment.reference ?? "No reference"}</TableCell>
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
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Line total</TableHead>
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
