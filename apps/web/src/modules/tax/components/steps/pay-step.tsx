import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { MarkPaidForm } from "../mark-paid-form";

type PayStepProps = {
  onMarkPaid: (payload: { paidAt: string; method: string; amountCents: number }) => void;
  isSubmitting?: boolean;
  defaultAmountCents?: number | null;
};

export function PayStep({ onMarkPaid, isSubmitting, defaultAmountCents }: PayStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark as paid</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MarkPaidForm
          onSubmit={onMarkPaid}
          isSubmitting={isSubmitting}
          defaultAmountCents={defaultAmountCents}
        />
      </CardContent>
    </Card>
  );
}
