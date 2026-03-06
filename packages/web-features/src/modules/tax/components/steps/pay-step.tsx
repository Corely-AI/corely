import React from "react";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { formatDate, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import type { MarkTaxFilingPaidRequest, TaxFilingPaymentInstructions } from "@corely/contracts";
import { MarkPaidDialog } from "../mark-paid-dialog";

type PayStepProps = {
  onMarkPaid: (payload: MarkTaxFilingPaidRequest) => void;
  isSubmitting?: boolean;
  defaultAmountCents?: number | null;
  dueDate: string;
  currency?: string;
  paymentInstructions?: TaxFilingPaymentInstructions;
};

export function PayStep({
  onMarkPaid,
  isSubmitting,
  defaultAmountCents,
  dueDate,
  currency,
  paymentInstructions,
}: PayStepProps) {
  const [isDialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount due</span>
            <span className="font-medium">
              {defaultAmountCents != null
                ? formatMoney(defaultAmountCents, "en-US", currency)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Due date</span>
            <span className="font-medium">{formatDate(dueDate, "en-US")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment reference</span>
            <span className="font-medium">
              {paymentInstructions?.reference ?? "Not configured"}
            </span>
          </div>
          {paymentInstructions?.ibanMasked ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">IBAN</span>
              <span className="font-medium">{paymentInstructions.ibanMasked}</span>
            </div>
          ) : null}
        </div>

        <Button onClick={() => setDialogOpen(true)} disabled={isSubmitting}>
          Mark as paid
        </Button>

        <MarkPaidDialog
          open={isDialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={onMarkPaid}
          isSubmitting={isSubmitting}
          defaultAmountCents={defaultAmountCents}
        />
      </CardContent>
    </Card>
  );
}
