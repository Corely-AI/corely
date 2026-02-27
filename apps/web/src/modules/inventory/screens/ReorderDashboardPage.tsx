import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ReorderDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [warehouseIdFilter, setWarehouseIdFilter] = useState("");

  const { data: warehouses } = useQuery({
    queryKey: inventoryQueryKeys.warehouses.list(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const { data: suggestions } = useQuery({
    queryKey: inventoryQueryKeys.reorder.suggestions({
      warehouseId: warehouseIdFilter || undefined,
    }),
    queryFn: () =>
      inventoryApi.getReorderSuggestions({ warehouseId: warehouseIdFilter || undefined }),
  });

  const { data: lowStock } = useQuery({
    queryKey: inventoryQueryKeys.reorder.lowStock({ warehouseId: warehouseIdFilter || undefined }),
    queryFn: () => inventoryApi.getLowStock({ warehouseId: warehouseIdFilter || undefined }),
  });

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [minQty, setMinQty] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(0);

  const createPolicy = useMutation({
    mutationFn: () =>
      inventoryApi.createReorderPolicy({
        productId,
        warehouseId,
        minQty,
        reorderPoint,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.reorder.policies() }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.reorder.suggestions() }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.reorder.lowStock() }),
      ]);
      setProductId("");
      setWarehouseId("");
      setMinQty(0);
      setReorderPoint(0);
      toast.success("Reorder policy created");
    },
    onError: () => toast.error("Failed to create reorder policy"),
  });

  const totalSuggestedQty = useMemo(
    () => suggestions?.items.reduce((sum, item) => sum + item.suggestedQty, 0) ?? 0,
    [suggestions?.items]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-foreground">Reorder Dashboard</h1>
          <p className="text-sm text-muted-foreground">Low-stock alerts and reorder suggestions</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/inventory/usage")}>
          Usage report
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>Filter warehouse</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={warehouseIdFilter}
              onChange={(event) => setWarehouseIdFilter(event.target.value)}
            >
              <option value="">All warehouses</option>
              {warehouses?.items.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Low-stock items
              </div>
              <div className="text-2xl font-semibold text-amber-600">
                {lowStock?.items.length ?? 0}
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Suggested reorder rows
              </div>
              <div className="text-2xl font-semibold">{suggestions?.items.length ?? 0}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total suggested qty
              </div>
              <div className="text-2xl font-semibold">{totalSuggestedQty}</div>
            </div>
          </div>

          {(lowStock?.items.length ?? 0) > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {(lowStock?.items.length ?? 0).toString()} products need immediate attention
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create reorder policy</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Product Id</Label>
              <Input value={productId} onChange={(event) => setProductId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
              >
                <option value="">Select warehouse</option>
                {warehouses?.items.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Min Qty</Label>
              <Input
                type="number"
                min="0"
                value={minQty}
                onChange={(event) => setMinQty(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(event) => setReorderPoint(Number(event.target.value))}
              />
            </div>
          </div>
          <Button
            variant="accent"
            onClick={() => createPolicy.mutate()}
            disabled={!productId || !warehouseId || createPolicy.isPending}
          >
            Add Policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold">Low-stock alerts</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Product</th>
                <th>Warehouse</th>
                <th>Available</th>
                <th>Reorder point</th>
                <th>Suggested Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStock?.items.map((item) => (
                <tr
                  key={`${item.productId}-${item.warehouseId}`}
                  className="border-t border-border"
                >
                  <td className="py-2 font-medium">{item.productId}</td>
                  <td>{item.warehouseId}</td>
                  <td className="font-medium text-rose-600">{item.availableQty}</td>
                  <td>{item.reorderPoint ?? item.minQty ?? "-"}</td>
                  <td>{item.suggestedQty}</td>
                  <td>
                    <Badge variant="outline">Low stock</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold">Reorder suggestions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Product</th>
                <th>Warehouse</th>
                <th>Available</th>
                <th>Suggested Qty</th>
              </tr>
            </thead>
            <tbody>
              {suggestions?.items.map((item) => (
                <tr
                  key={`${item.productId}-${item.warehouseId}`}
                  className="border-t border-border"
                >
                  <td className="py-2 font-medium">{item.productId}</td>
                  <td>{item.warehouseId}</td>
                  <td>{item.availableQty}</td>
                  <td>{item.suggestedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
