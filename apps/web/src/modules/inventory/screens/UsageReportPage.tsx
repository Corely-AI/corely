import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

const toDateInput = (value: Date): string => value.toISOString().slice(0, 10);

const addDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

type UsageRow = {
  productId: string;
  totalConsumedQty: number;
  shipmentQty: number;
  adjustmentQty: number;
  moveCount: number;
};

export default function UsageReportPage() {
  const [warehouseId, setWarehouseId] = useState("");
  const [fromDate, setFromDate] = useState(toDateInput(addDays(new Date(), -30)));
  const [toDate, setToDate] = useState(toDateInput(new Date()));

  const { data: warehouses } = useQuery({
    queryKey: inventoryQueryKeys.warehouses.list(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const {
    data: usageMoves,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: inventoryQueryKeys.reports.usage({
      warehouseId: warehouseId || undefined,
      fromDate,
      toDate,
    }),
    queryFn: async () => {
      const items: Awaited<ReturnType<typeof inventoryApi.listStockMoves>>["items"] = [];
      let cursor: string | undefined;
      let pageCount = 0;

      do {
        const page = await inventoryApi.listStockMoves({
          warehouseId: warehouseId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          cursor,
          pageSize: 100,
        });
        items.push(...page.items);
        cursor = page.nextCursor ?? undefined;
        pageCount += 1;
      } while (cursor && pageCount < 20);

      return items;
    },
  });

  const usageRows = useMemo<UsageRow[]>(() => {
    const aggregation = new Map<string, UsageRow>();

    (usageMoves ?? [])
      .filter((move) => move.quantityDelta < 0)
      .forEach((move) => {
        const key = move.productId;
        const current = aggregation.get(key) ?? {
          productId: key,
          totalConsumedQty: 0,
          shipmentQty: 0,
          adjustmentQty: 0,
          moveCount: 0,
        };

        const consumed = Math.abs(move.quantityDelta);
        current.totalConsumedQty += consumed;
        current.moveCount += 1;

        if (move.reasonCode === "SHIPMENT") {
          current.shipmentQty += consumed;
        }
        if (move.reasonCode === "ADJUSTMENT") {
          current.adjustmentQty += consumed;
        }

        aggregation.set(key, current);
      });

    return [...aggregation.values()].sort((a, b) => b.totalConsumedQty - a.totalConsumedQty);
  }, [usageMoves]);

  const totals = useMemo(
    () => ({
      totalConsumedQty: usageRows.reduce((sum, row) => sum + row.totalConsumedQty, 0),
      totalMoves: usageRows.reduce((sum, row) => sum + row.moveCount, 0),
      productCount: usageRows.length,
    }),
    [usageRows]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Usage Report</h1>
          <p className="text-sm text-muted-foreground">
            Track material consumption by product and movement reason
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total consumed qty
              </div>
              <div className="text-2xl font-semibold">{totals.totalConsumedQty}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Consumption moves
              </div>
              <div className="text-2xl font-semibold">{totals.totalMoves}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Products impacted
              </div>
              <div className="text-2xl font-semibold">{totals.productCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading usage report...</div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">Failed to load usage report.</div>
          ) : usageRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No consumption data in selected range.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Product</th>
                  <th>Total consumed</th>
                  <th>Shipment qty</th>
                  <th>Adjustment qty</th>
                  <th>Moves</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((row) => (
                  <tr key={row.productId} className="border-t border-border">
                    <td className="py-2 font-medium">{row.productId}</td>
                    <td>{row.totalConsumedQty}</td>
                    <td>{row.shipmentQty}</td>
                    <td>{row.adjustmentQty}</td>
                    <td>{row.moveCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
