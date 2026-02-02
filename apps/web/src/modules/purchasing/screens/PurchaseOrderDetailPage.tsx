import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Check, Send, PackageCheck, Archive, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { purchasingApi } from "@/lib/purchasing-api";
import { formatMoney } from "@/shared/lib/formatters";

export default function PurchaseOrderDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["purchaseOrders", id],
    queryFn: () => purchasingApi.getPurchaseOrder(id || ""),
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
      purchasingApi.updatePurchaseOrder(id || "", {
        headerPatch: { notes },
        lineItems: lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unitCostCents: Number(item.unitCostCents),
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrders", id] });
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });

  const approve = useMutation({
    mutationFn: () => purchasingApi.approvePurchaseOrder(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["purchaseOrders", id] }),
  });
  const markSent = useMutation({
    mutationFn: () => purchasingApi.sendPurchaseOrder(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["purchaseOrders", id] }),
  });
  const markReceived = useMutation({
    mutationFn: () => purchasingApi.receivePurchaseOrder(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["purchaseOrders", id] }),
  });
  const close = useMutation({
    mutationFn: () => purchasingApi.closePurchaseOrder(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["purchaseOrders", id] }),
  });
  const cancel = useMutation({
    mutationFn: () => purchasingApi.cancelPurchaseOrder(id || ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["purchaseOrders", id] }),
  });

  if (!data) {
    return null;
  }

  const editable = data.status === "DRAFT";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/purchasing/purchase-orders")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">
              {t("purchasing.purchaseOrders.detailTitle")}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{data.poNumber || t("purchasing.statuses.draft")}</span>
              <Badge>{t(`purchasing.statuses.${data.status.toLowerCase()}`)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editable && (
            <Button variant="accent" onClick={() => updateMutation.mutate()}>
              <Save className="h-4 w-4" />
              {t("purchasing.actions.saveDraft")}
            </Button>
          )}
          {data.status === "DRAFT" && (
            <Button variant="outline" onClick={() => approve.mutate()}>
              <Check className="h-4 w-4" />
              {t("purchasing.actions.approve")}
            </Button>
          )}
          {data.status === "APPROVED" && (
            <Button variant="outline" onClick={() => markSent.mutate()}>
              <Send className="h-4 w-4" />
              {t("purchasing.actions.markSent")}
            </Button>
          )}
          {(data.status === "SENT" || data.status === "APPROVED") && (
            <Button variant="outline" onClick={() => markReceived.mutate()}>
              <PackageCheck className="h-4 w-4" />
              {t("purchasing.actions.receive")}
            </Button>
          )}
          {(data.status === "SENT" || data.status === "RECEIVED" || data.status === "APPROVED") && (
            <Button variant="outline" onClick={() => close.mutate()}>
              <Archive className="h-4 w-4" />
              {t("common.close")}
            </Button>
          )}
          {data.status !== "CLOSED" && data.status !== "CANCELED" && (
            <Button variant="ghost" onClick={() => cancel.mutate()}>
              <XCircle className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>{t("purchasing.fields.supplier")}</Label>
                <Input value={data.supplierPartyId} disabled />
              </div>
              <div>
                <Label>{t("purchasing.fields.currency")}</Label>
                <Input value={data.currency} disabled={!editable} />
              </div>
              <div>
                <Label>{t("purchasing.fields.orderDate")}</Label>
                <Input value={data.orderDate || ""} disabled />
              </div>
              <div>
                <Label>{t("purchasing.fields.expectedDelivery")}</Label>
                <Input value={data.expectedDeliveryDate || ""} disabled />
              </div>
            </div>

            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!editable}
              />
            </div>

            <div className="space-y-3">
              <Label>{t("purchasing.fields.lineItems")}</Label>
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
              <h2 className="text-lg font-semibold">{t("common.totals")}</h2>
              <div className="flex items-center justify-between text-sm">
                <span>{t("common.subtotal")}</span>
                <span>{formatMoney(data.totals.subtotalCents, i18n.t("common.locale"))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{t("common.tax")}</span>
                <span>{formatMoney(data.totals.taxCents, i18n.t("common.locale"))}</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>{t("common.total")}</span>
                <span>{formatMoney(data.totals.totalCents, i18n.t("common.locale"))}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
