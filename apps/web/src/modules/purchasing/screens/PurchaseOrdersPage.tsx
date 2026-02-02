import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Check, Send, PackageCheck, XCircle, Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { purchasingApi } from "@/lib/purchasing-api";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";

export default function PurchaseOrdersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => purchasingApi.listPurchaseOrders(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => purchasingApi.approvePurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
  });

  const markSent = useMutation({
    mutationFn: (id: string) => purchasingApi.sendPurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
  });

  const markReceived = useMutation({
    mutationFn: (id: string) => purchasingApi.receivePurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
  });

  const close = useMutation({
    mutationFn: (id: string) => purchasingApi.closePurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => purchasingApi.cancelPurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
  });

  const orders = data?.items ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("purchasing.purchaseOrders.title")}</h1>
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => navigate("/purchasing/purchase-orders/new")}>
            <Plus className="h-4 w-4" />
            {t("purchasing.purchaseOrders.new")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/purchasing/copilot")}>
            {t("purchasing.purchaseOrders.aiCreate")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <EmptyState
              title={t("purchasing.purchaseOrders.emptyTitle")}
              description={t("purchasing.purchaseOrders.emptyDescription")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("purchasing.purchaseOrders.columns.number")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("purchasing.fields.supplier")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("common.status")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("purchasing.fields.expectedDelivery")}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("common.total")}
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {order.poNumber || t("purchasing.statuses.draft")}
                      </td>
                      <td className="px-4 py-3 text-sm">{order.supplierPartyId}</td>
                      <td className="px-4 py-3">
                        <Badge>{t(`purchasing.statuses.${order.status.toLowerCase()}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.expectedDeliveryDate
                          ? formatDate(order.expectedDeliveryDate, i18n.t("common.locale"))
                          : t("common.empty")}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(order.totals.totalCents, i18n.t("common.locale"))}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/purchasing/purchase-orders/${order.id}`)}
                            >
                              {t("common.view")}
                            </DropdownMenuItem>
                            {order.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => approve.mutate(order.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.approve")}
                              </DropdownMenuItem>
                            )}
                            {order.status === "APPROVED" && (
                              <DropdownMenuItem onClick={() => markSent.mutate(order.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.markSent")}
                              </DropdownMenuItem>
                            )}
                            {(order.status === "SENT" || order.status === "APPROVED") && (
                              <DropdownMenuItem onClick={() => markReceived.mutate(order.id)}>
                                <PackageCheck className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.markReceived")}
                              </DropdownMenuItem>
                            )}
                            {(order.status === "SENT" ||
                              order.status === "RECEIVED" ||
                              order.status === "APPROVED") && (
                              <DropdownMenuItem onClick={() => close.mutate(order.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                {t("common.close")}
                              </DropdownMenuItem>
                            )}
                            {order.status !== "CLOSED" && order.status !== "CANCELED" && (
                              <DropdownMenuItem onClick={() => cancel.mutate(order.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                {t("common.cancel")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
