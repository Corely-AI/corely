import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@corely/ui";
import { Label } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function StockOverviewPage() {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshIntervalMs = autoRefresh ? 15000 : false;

  const { data: warehouses } = useQuery({
    queryKey: inventoryQueryKeys.warehouses.list(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const {
    data: stock,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: inventoryQueryKeys.stock.available({ warehouseId: warehouseId || undefined }),
    queryFn: () => inventoryApi.getAvailable({ warehouseId: warehouseId || undefined }),
    refetchInterval: refreshIntervalMs,
  });

  const { data: lowStock } = useQuery({
    queryKey: inventoryQueryKeys.reorder.lowStock({ warehouseId: warehouseId || undefined }),
    queryFn: () => inventoryApi.getLowStock({ warehouseId: warehouseId || undefined }),
    refetchInterval: refreshIntervalMs,
  });

  const lowStockCount = lowStock?.items.length ?? 0;
  const totalAvailable = useMemo(
    () => stock?.items.reduce((sum, item) => sum + item.availableQty, 0) ?? 0,
    [stock?.items]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Stock Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time inventory visibility with automatic refresh every 15 seconds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "accent" : "outline"}
            onClick={() => setAutoRefresh((prev) => !prev)}
          >
            {autoRefresh ? "Auto refresh ON" : "Auto refresh OFF"}
          </Button>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className="h-4 w-4" />
            Refresh now
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total available qty
              </div>
              <div className="text-2xl font-semibold">{totalAvailable}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Low-stock alerts
              </div>
              <div className="text-2xl font-semibold text-amber-600">{lowStockCount}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Last synced
              </div>
              <div className="text-sm font-medium">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "-"}
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            <Label>Warehouse</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
            >
              <option value="">All warehouses</option>
              {warehouses?.items.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {lowStockCount > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {lowStockCount} products are below threshold
              </div>
            </div>
          ) : null}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Product</th>
                <th>Location</th>
                <th>On-hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stock?.items.map((item) => {
                const isDepleted = item.availableQty <= 0;
                return (
                  <tr
                    key={`${item.productId}-${item.locationId}`}
                    className="border-t border-border"
                  >
                    <td className="py-2 font-medium">{item.productId}</td>
                    <td>{item.locationId || "-"}</td>
                    <td>{item.onHandQty}</td>
                    <td>{item.reservedQty}</td>
                    <td
                      className={
                        isDepleted ? "font-semibold text-rose-600" : "font-medium text-emerald-600"
                      }
                    >
                      {item.availableQty}
                    </td>
                    <td>
                      {isDepleted ? (
                        <Badge variant="outline">At risk</Badge>
                      ) : (
                        <Badge variant="accent">Healthy</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
