import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { purchasingApi } from "@/lib/purchasing-api";

export default function RecordBillPaymentPage() {
  const uiCopy = useUiCopy("ui.purchasing-recordbillpaymentpage");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();

  const { data } = useQuery({
    queryKey: ["vendorBills", activeWorkspaceId, id],
    queryFn: () => purchasingApi.getVendorBill(id || ""),
    enabled: Boolean(id && activeWorkspaceId),
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
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId, id] });
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
        <h1 className="text-h1 text-foreground">{uiCopy("record-payment")}</h1>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>{uiCopy("amount-cents")}</Label>
              <Input
                type="number"
                min="1"
                value={amountCents}
                onChange={(event) => setAmountCents(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("payment-date")}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("method")}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="BANK_TRANSFER">{uiCopy("bank-transfer")}</option>
                <option value="CASH">{uiCopy("cash")}</option>
                <option value="CARD">{uiCopy("card")}</option>
                <option value="OTHER">{uiCopy("other")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("reference")}</Label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
          </div>

          <Button
            variant="accent"
            onClick={() => recordPayment.mutate()}
            disabled={recordPayment.isPending}
          >
            {recordPayment.isPending ? uiCopy("recording") : uiCopy("record-payment")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
