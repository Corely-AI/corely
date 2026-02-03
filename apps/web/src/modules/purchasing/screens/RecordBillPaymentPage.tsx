import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { purchasingApi } from "@/lib/purchasing-api";

export default function RecordBillPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["vendorBills", id],
    queryFn: () => purchasingApi.getVendorBill(id || ""),
    enabled: Boolean(id),
  });

  const [amountCents, setAmountCents] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (data) {
      setAmountCents(data.totals.dueCents);
    }
  }, [data]);

  const recordPayment = useMutation({
    mutationFn: () =>
      purchasingApi.recordBillPayment({
        vendorBillId: id || "",
        amountCents: Number(amountCents),
        currency: data?.currency || "EUR",
        paymentDate,
        method: method as any,
        reference: reference || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", id] });
      void queryClient.invalidateQueries({ queryKey: ["vendorBills"] });
      navigate(`/purchasing/vendor-bills/${id}`);
    },
  });

  if (!data) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/purchasing/vendor-bills/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-h1 text-foreground">Record Payment</h1>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Amount (cents)</Label>
              <Input
                type="number"
                min="1"
                value={amountCents}
                onChange={(event) => setAmountCents(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
          </div>

          <Button
            variant="accent"
            onClick={() => recordPayment.mutate()}
            disabled={recordPayment.isPending}
          >
            {recordPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
