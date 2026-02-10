import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Filter } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Badge } from "@corely/ui";
import { inventoryLotsApi } from "@/lib/inventory-lots-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { useNavigate } from "react-router-dom";
import type { InventoryLotStatus } from "@corely/contracts";

export default function LotsPage() {
  const navigate = useNavigate();

  const [productIdFilter, setProductIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryLotStatus | "">("");
  const [expiryBeforeFilter, setExpiryBeforeFilter] = useState("");
  const [expiryAfterFilter, setExpiryAfterFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    productId: productIdFilter || undefined,
    status: statusFilter || undefined,
    expiryBefore: expiryBeforeFilter || undefined,
    expiryAfter: expiryAfterFilter || undefined,
    qtyOnHandGt: 0,
  };

  const { data, isLoading } = useQuery({
    queryKey: inventoryQueryKeys.lots.list(queryParams),
    queryFn: () => inventoryLotsApi.listLots(queryParams),
  });

  const getStatusColor = (status: InventoryLotStatus): "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "AVAILABLE":
        return "secondary";
      case "QUARANTINE":
        return "outline";
      case "BLOCKED":
        return "destructive";
      case "DISPOSED":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) {
      return "-";
    }
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-h1 text-foreground">Inventory Lots</h1>
            <p className="text-sm text-muted-foreground">Manage and track product lots</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <Button variant="accent" onClick={() => navigate("/inventory/lots/new")}>
            Create Lot
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Product ID</Label>
                <Input
                  value={productIdFilter}
                  onChange={(e) => setProductIdFilter(e.target.value)}
                  placeholder="Filter by product..."
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InventoryLotStatus | "")}
                >
                  <option value="">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="QUARANTINE">Quarantine</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="DISPOSED">Disposed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Expiry After</Label>
                <Input
                  type="date"
                  value={expiryAfterFilter}
                  onChange={(e) => setExpiryAfterFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Before</Label>
                <Input
                  type="date"
                  value={expiryBeforeFilter}
                  onChange={(e) => setExpiryBeforeFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProductIdFilter("");
                  setStatusFilter("");
                  setExpiryBeforeFilter("");
                  setExpiryAfterFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading lots...</div>
          ) : !data?.lots.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No lots found. Create your first lot to get started.
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {data.lots.length} of {data.total} lots
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-3">Lot Number</th>
                    <th>Product ID</th>
                    <th>Expiry Date</th>
                    <th>Qty On Hand</th>
                    <th>Qty Reserved</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.lots.map((lot) => (
                    <tr key={lot.id} className="border-t border-border hover:bg-muted/50">
                      <td className="py-3 font-medium">{lot.lotNumber}</td>
                      <td className="text-muted-foreground">{lot.productId}</td>
                      <td>{formatDate(lot.expiryDate)}</td>
                      <td>{lot.qtyOnHand}</td>
                      <td>{lot.qtyReserved}</td>
                      <td>
                        <Badge variant={getStatusColor(lot.status)}>{lot.status}</Badge>
                      </td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/inventory/lots/${lot.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
