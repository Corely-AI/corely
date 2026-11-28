import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, TrendingUp, Truck, User, Calendar, DollarSign } from "lucide-react";
import { LoadingSkeleton, Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryLotsApi } from "@/lib/inventory-lots-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import type { InventoryLotStatus } from "@corely/contracts";

export default function LotDetailPage() {
  const uiCopy = useUiCopy("ui.inventory-lotdetailpage");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: lot, isLoading } = useQuery({
    queryKey: inventoryQueryKeys.lots.detail(id || ""),
    queryFn: () => inventoryLotsApi.getLot(id || ""),
    enabled: Boolean(id),
  });

  const { data: stockMoves } = useQuery({
    queryKey: inventoryQueryKeys.stock.moves({ productId: lot?.productId }),
    queryFn: () => inventoryApi.listStockMoves({ productId: lot?.productId }),
    enabled: Boolean(lot?.productId),
  });

  if (isLoading) {
    return (
      <LoadingSkeleton
        variant="detail"
        label={uiCopy("loading-lot-details")}
        className="p-6 lg:p-8"
        withHeading
      />
    );
  }

  if (!lot) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-8 text-muted-foreground">{uiCopy("lot-not-found")}</div>
      </div>
    );
  }

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

  const formatCurrency = (cents: number | null | undefined) => {
    if (cents === null || cents === undefined) {
      return "-";
    }
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/lots")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">
              {uiCopy("lot") + " "}
              {lot.lotNumber}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>
                {uiCopy("product") + " "}
                {lot.productId}
              </span>
              <Badge variant={getStatusColor(lot.status)}>{lot.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{uiCopy("lot-information")}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("lot-number")}</div>
                <div className="text-sm font-medium">{lot.lotNumber}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("product-id")}</div>
                <div className="text-sm font-medium">{lot.productId}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("status")}</div>
                <Badge variant={getStatusColor(lot.status)}>{lot.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{uiCopy("dates")}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("manufacturing-date")}</div>
                <div className="text-sm font-medium">{formatDate(lot.mfgDate)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("expiry-date")}</div>
                <div className="text-sm font-medium">{formatDate(lot.expiryDate)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("received-date")}</div>
                <div className="text-sm font-medium">{formatDate(lot.receivedDate)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{uiCopy("quantity")}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("qty-received")}</div>
                <div className="text-sm font-medium">{lot.qtyReceived}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("qty-on-hand")}</div>
                <div className="text-sm font-medium">{lot.qtyOnHand}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("qty-reserved")}</div>
                <div className="text-sm font-medium">{lot.qtyReserved}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{uiCopy("traceability")}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("shipment-id")}</div>
                <div className="text-sm font-medium">
                  {lot.shipmentId ? (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => navigate(`/purchasing/shipments/${lot.shipmentId}`)}
                    >
                      {lot.shipmentId}
                    </Button>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("supplier")}</div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {lot.supplierPartyId ? (
                    <>
                      <User className="h-4 w-4" />
                      {lot.supplierPartyId}
                    </>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{uiCopy("unit-cost")}</div>
                <div className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(lot.unitCostCents)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">{uiCopy("notes")}</h2>
            <div className="text-sm text-muted-foreground">
              {lot.notes || uiCopy("no-notes-available-for")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">{uiCopy("stock-movements")}</h2>
          {!stockMoves?.items.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {uiCopy("no-stock-movements-found")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-3">{uiCopy("date")}</th>
                  <th>{uiCopy("document-type")}</th>
                  <th>{uiCopy("location")}</th>
                  <th>{uiCopy("quantity-delta")}</th>
                  <th>{uiCopy("reason")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stockMoves.items.map((move) => (
                  <tr key={move.id} className="border-t border-border">
                    <td className="py-3">{formatDate(move.postingDate)}</td>
                    <td>{move.documentType}</td>
                    <td className="text-muted-foreground">{move.locationId}</td>
                    <td className={move.quantityDelta > 0 ? "text-green-600" : "text-red-600"}>
                      {move.quantityDelta > 0 ? "+" : ""}
                      {move.quantityDelta}
                    </td>
                    <td>{move.reasonCode}</td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/inventory/documents/${move.documentId}`)}
                      >
                        {uiCopy("view-doc")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {lot.metadataJson && Object.keys(lot.metadataJson).length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">{uiCopy("metadata")}</h2>
            <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(lot.metadataJson, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
