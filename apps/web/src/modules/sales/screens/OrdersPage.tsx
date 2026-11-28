import { useTranslation } from "react-i18next";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { LoadingSkeleton, Badge } from "@corely/ui";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { formatMoney } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import type { SalesOrderDto } from "@corely/contracts";

const getStatusVariant = (status: SalesOrderDto["status"]) => {
  switch (status) {
    case "DRAFT":
      return "muted" as const;
    case "CONFIRMED":
      return "accent" as const;
    case "FULFILLED":
      return "success" as const;
    case "CANCELED":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const uiCopy = useUiCopy("ui.sales-orderspage");
  const navigate = useNavigate();

  const {
    data: ordersData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: salesQueryKeys.orders.list(),
    queryFn: () => salesApi.listOrders(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const orders = ordersData?.items ?? [];
  const customers = customersData?.customers ?? [];
  const getCustomerName = (partyId: string) =>
    customers.find((customer) => customer.id === partyId)?.displayName ?? "Unknown";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{uiCopy("orders")}</h1>
          <p className="text-muted-foreground">{uiCopy("track-order-confirmations-and")}</p>
        </div>
        <Button variant="accent" onClick={() => navigate("/sales/orders/new")}>
          <Plus className="h-4 w-4" />
          {uiCopy("new-order")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton variant="list" label={t("common.loading")} />
          ) : isError && !ordersData ? (
            <p className="p-4 text-sm text-destructive" role="alert">
              {t("common.error")}
            </p>
          ) : orders.length === 0 ? (
            <EmptyState
              title={uiCopy("no-orders-yet")}
              description={uiCopy("convert-a-quote-or")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("order")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("customer")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("status")}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("total")}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {order.number ?? uiCopy("draft")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getCustomerName(order.customerPartyId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(order.totals.totalCents, "en-US", order.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales/orders/${order.id}`)}
                        >
                          {uiCopy("view")}
                        </Button>
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
