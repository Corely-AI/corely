import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Check, Send, PackageCheck, XCircle, Archive } from "lucide-react";
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
        <h1 className="text-h1 text-foreground">Purchase Orders</h1>
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => navigate("/purchasing/purchase-orders/new")}>
            <Plus className="h-4 w-4" />
            New PO
          </Button>
          <Button variant="outline" onClick={() => navigate("/purchasing/copilot")}>
            AI: Create PO from text
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <EmptyState
              title="No purchase orders"
              description="Create your first PO or use AI to draft one."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      PO #
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Supplier
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Expected Delivery
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      Total
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
                      <td className="px-4 py-3 text-sm font-medium">{order.poNumber || "Draft"}</td>
                      <td className="px-4 py-3 text-sm">{order.supplierPartyId}</td>
                      <td className="px-4 py-3">
                        <Badge>{order.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.expectedDeliveryDate
                          ? formatDate(order.expectedDeliveryDate, "en-US")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(order.totals.totalCents, "en-US")}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/purchasing/purchase-orders/${order.id}`)}
                            >
                              View
                            </DropdownMenuItem>
                            {order.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => approve.mutate(order.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {order.status === "APPROVED" && (
                              <DropdownMenuItem onClick={() => markSent.mutate(order.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Mark Sent
                              </DropdownMenuItem>
                            )}
                            {(order.status === "SENT" || order.status === "APPROVED") && (
                              <DropdownMenuItem onClick={() => markReceived.mutate(order.id)}>
                                <PackageCheck className="mr-2 h-4 w-4" />
                                Mark Received
                              </DropdownMenuItem>
                            )}
                            {(order.status === "SENT" ||
                              order.status === "RECEIVED" ||
                              order.status === "APPROVED") && (
                              <DropdownMenuItem onClick={() => close.mutate(order.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Close
                              </DropdownMenuItem>
                            )}
                            {order.status !== "CLOSED" && order.status !== "CANCELED" && (
                              <DropdownMenuItem onClick={() => cancel.mutate(order.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
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
