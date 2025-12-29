import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Check, Upload, CreditCard, XCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { purchasingApi } from "@/lib/purchasing-api";
import { formatMoney } from "@/shared/lib/formatters";

export default function VendorBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["vendorBills", id],
    queryFn: () => purchasingApi.getVendorBill(id || ""),
    enabled: Boolean(id),
  });

  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<
    { id: string; description: string; quantity: number; unitCostCents: number }[]
  >([]);

  useEffect(() => {
    if (data) {
      setNotes(data.notes || "");
      setLineItems(
        data.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitCostCents: item.unitCostCents,
        }))
      );
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      purchasingApi.updateVendorBill(id || "", {
        headerPatch: { notes },
        lineItems: lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unitCostCents: Number(item.unitCostCents),
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", id] });
      void queryClient.invalidateQueries({ queryKey: ["vendorBills"] });
    },
  });

  const approve = useMutation({
    mutationFn: () => purchasingApi.approveVendorBill(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["vendorBills", id] }),
  });
  const post = useMutation({
    mutationFn: () => purchasingApi.postVendorBill(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["vendorBills", id] }),
  });
  const voidBill = useMutation({
    mutationFn: () => purchasingApi.voidVendorBill(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["vendorBills", id] }),
  });

  if (!data) {
    return null;
  }

  const editable = data.status === "DRAFT";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchasing/vendor-bills")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">Vendor Bill</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{data.billNumber || "Draft"}</span>
              <Badge>{data.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editable && (
            <Button variant="accent" onClick={() => updateMutation.mutate()}>
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}
          {data.status === "DRAFT" && (
            <Button variant="outline" onClick={() => approve.mutate()}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
          )}
          {data.status === "APPROVED" && (
            <Button variant="outline" onClick={() => post.mutate()}>
              <Upload className="h-4 w-4" />
              Post
            </Button>
          )}
          {data.status === "POSTED" && (
            <Button
              variant="outline"
              onClick={() => navigate(`/purchasing/vendor-bills/${data.id}/pay`)}
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          )}
          {data.status !== "VOID" && (
            <Button variant="ghost" onClick={() => voidBill.mutate()}>
              <XCircle className="h-4 w-4" />
              Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>Supplier</Label>
                <Input value={data.supplierPartyId} disabled />
              </div>
              <div>
                <Label>Bill Number</Label>
                <Input value={data.billNumber || ""} disabled />
              </div>
              <div>
                <Label>Bill Date</Label>
                <Input value={data.billDate} disabled />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input value={data.dueDate} disabled />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={data.currency} disabled={!editable} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!editable}
              />
            </div>

            <div className="space-y-3">
              <Label>Line Items</Label>
              {lineItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" value={item.description} disabled />
                  <Input
                    className="col-span-2"
                    type="number"
                    value={item.quantity}
                    disabled={!editable}
                    onChange={(event) => {
                      const next = [...lineItems];
                      next[idx] = { ...next[idx], quantity: Number(event.target.value) };
                      setLineItems(next);
                    }}
                  />
                  <Input
                    className="col-span-4"
                    type="number"
                    value={item.unitCostCents}
                    disabled={!editable}
                    onChange={(event) => {
                      const next = [...lineItems];
                      next[idx] = { ...next[idx], unitCostCents: Number(event.target.value) };
                      setLineItems(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold">Totals</h2>
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(data.totals.subtotalCents, "en-US")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Tax</span>
                <span>{formatMoney(data.totals.taxCents, "en-US")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Paid</span>
                <span>{formatMoney(data.totals.paidCents, "en-US")}</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Due</span>
                <span>{formatMoney(data.totals.dueCents, "en-US")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
