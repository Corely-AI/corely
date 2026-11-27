import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { OrderForm, type OrderFormValues } from "../components/OrderForm";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import { toast } from "sonner";

export default function OrderDetailPage() {
  const uiCopy = useUiCopy("ui.sales-orderdetailpage");
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orderData, isLoading } = useQuery({
    queryKey: salesQueryKeys.orders.detail(orderId ?? ""),
    queryFn: () => salesApi.getOrder(orderId ?? ""),
    enabled: Boolean(orderId),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });
  const customers = (customersData?.customers ?? []).flatMap((customer) =>
    customer.id && customer.displayName
      ? [{ id: customer.id, displayName: customer.displayName }]
      : []
  );

  const order = orderData?.order;
  const isDraft = order?.status === "DRAFT";

  const updateMutation = useMutation({
    mutationFn: (values: OrderFormValues) =>
      salesApi.updateOrder(orderId ?? "", {
        orderId: orderId ?? "",
        headerPatch: {
          customerPartyId: values.customerPartyId,
          currency: values.currency,
          orderDate: values.orderDate,
          deliveryDate: values.deliveryDate,
          notes: values.notes,
        },
        lineItems: values.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.orders.detail(orderId ?? "") });
      toast.success(uiCopy("order-updated"));
    },
    onError: () => toast.error(uiCopy("failed-to-update-order")),
  });

  const confirmMutation = useMutation({
    mutationFn: () => salesApi.confirmOrder(orderId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.orders.detail(orderId ?? "") });
      toast.success(uiCopy("order-confirmed"));
    },
    onError: () => toast.error(uiCopy("failed-to-confirm-order")),
  });

  const fulfillMutation = useMutation({
    mutationFn: () => salesApi.fulfillOrder(orderId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.orders.detail(orderId ?? "") });
      toast.success(uiCopy("order-fulfilled"));
    },
    onError: () => toast.error(uiCopy("failed-to-fulfill-order")),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () => salesApi.createInvoiceFromOrder(orderId ?? ""),
    onSuccess: (data) => {
      toast.success(uiCopy("invoice-created"));
      const opened = window.open(
        `/sales/invoices/${data.invoice.id}`,
        "_blank",
        "noopener,noreferrer"
      );
      if (!opened) {
        toast.error(uiCopy("unable-to-open-invoice"));
      }
    },
    onError: () => toast.error(uiCopy("failed-to-create-invoice")),
  });

  if (isLoading) {
    return <PageLoadingSkeleton variant="detail" />;
  }

  if (!order) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">{uiCopy("loading-order")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 text-foreground">
              {uiCopy("order") + " "}
              {order.number ?? uiCopy("draft")}
            </h1>
            <Badge variant={isDraft ? "muted" : "accent"}>{order.status}</Badge>
          </div>
          <p className="text-muted-foreground">{uiCopy("manage-order-confirmation-and")}</p>
        </div>
        <div className="flex gap-2">
          {order.status === "DRAFT" && (
            <Button variant="accent" onClick={() => confirmMutation.mutate()}>
              {uiCopy("confirm-order")}
            </Button>
          )}
          {order.status === "CONFIRMED" && (
            <Button variant="secondary" onClick={() => fulfillMutation.mutate()}>
              {uiCopy("mark-fulfilled")}
            </Button>
          )}
          {order.status !== "INVOICED" && order.status !== "CANCELED" && (
            <Button variant="secondary" onClick={() => createInvoiceMutation.mutate()}>
              {uiCopy("create-invoice")}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <OrderForm
            customers={customers}
            initial={order}
            disabled={!isDraft}
            onSubmit={(values) => updateMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
