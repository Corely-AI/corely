import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type PayStepProps = {
  onMarkPaid: (payload: { paidAt: string; method: string; amountCents: number }) => void;
  isSubmitting?: boolean;
  defaultAmountCents?: number | null;
};

export function PayStep({ onMarkPaid, isSubmitting, defaultAmountCents }: PayStepProps) {
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [method, setMethod] = React.useState("manual");
  const [amount, setAmount] = React.useState<string>(
    defaultAmountCents != null ? (defaultAmountCents / 100).toFixed(2) : ""
  );

  const handleSubmit = () => {
    const parsed = Number.parseFloat(amount);
    if (Number.isNaN(parsed)) {
      return;
    }
    onMarkPaid({
      paidAt: new Date(paidAt).toISOString(),
      method,
      amountCents: Math.round(parsed * 100),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark as paid</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Paid at</Label>
          <Input
            type="datetime-local"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Method</Label>
          <Input value={method} onChange={(event) => setMethod(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Amount</Label>
          <Input value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
          Mark paid
        </Button>
      </CardContent>
    </Card>
  );
}
