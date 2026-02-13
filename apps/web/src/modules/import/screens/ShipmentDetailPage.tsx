import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Ship, ArrowLeft, Package } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@corely/ui";
import { importShipmentsApi } from "@/lib/import-shipments-api";
import type { AllocationMethod, ImportShipmentStatus } from "@corely/contracts";
import { toast } from "sonner";

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [allocationMethod, setAllocationMethod] = React.useState<AllocationMethod>("BY_FOB_VALUE");

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["import", "shipments", "detail", id],
    queryFn: async () => {
      if (!id || id === "new") {
        throw new Error("Invalid shipment id");
      }
      return importShipmentsApi.getShipment(id);
    },
    enabled: Boolean(id) && id !== "new",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === "new") {
        throw new Error("Invalid shipment id");
      }
      return importShipmentsApi.submitShipment(id);
    },
    onSuccess: async () => {
      toast.success("Shipment submitted");
      await queryClient.invalidateQueries({ queryKey: ["import", "shipments", "detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["import", "shipments"] });
    },
    onError: () => {
      toast.error("Failed to submit shipment");
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === "new") {
        throw new Error("Invalid shipment id");
      }
      return importShipmentsApi.allocateLandedCosts(id, { allocationMethod });
    },
    onSuccess: async () => {
      toast.success("Landed costs allocated");
      await queryClient.invalidateQueries({ queryKey: ["import", "shipments", "detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["import", "shipments"] });
    },
    onError: () => {
      toast.error("Failed to allocate landed costs");
    },
  });

  const getStatusColor = (
    status: ImportShipmentStatus
  ): "secondary" | "destructive" | "outline" | "default" => {
    switch (status) {
      case "DRAFT":
        return "outline";
      case "SUBMITTED":
        return "secondary";
      case "IN_TRANSIT":
        return "default";
      case "CUSTOMS_CLEARANCE":
        return "default";
      case "CLEARED":
        return "secondary";
      case "RECEIVED":
        return "secondary";
      case "CANCELED":
        return "destructive";
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
    if (!cents) {
      return "-";
    }
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-center text-muted-foreground">Loading shipment...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-center text-muted-foreground">Shipment not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/import/shipments")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Ship className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Import / Shipments / {shipment.shipmentNumber || shipment.id.slice(0, 8)}
            </p>
            <h1 className="text-h1 text-foreground">
              {shipment.shipmentNumber || `Shipment ${shipment.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-muted-foreground">Import shipment details</p>
          </div>
        </div>
        <Badge variant={getStatusColor(shipment.status)}>{shipment.status}</Badge>
        <div className="flex items-center gap-2">
          {shipment.status === "DRAFT" ? (
            <Button
              variant="outline"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          ) : null}
          {shipment.status === "RECEIVED" ? (
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={allocationMethod}
                onChange={(event) => setAllocationMethod(event.target.value as AllocationMethod)}
              >
                <option value="BY_FOB_VALUE">By FOB value</option>
                <option value="BY_WEIGHT">By weight</option>
                <option value="BY_VOLUME">By volume</option>
                <option value="EQUAL">Equal split</option>
              </select>
              <Button
                variant="outline"
                onClick={() => allocateMutation.mutate()}
                disabled={allocateMutation.isPending}
              >
                {allocateMutation.isPending ? "Allocating..." : "Allocate Costs"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">Shipping Mode:</div>
              <div className="font-medium">{shipment.shippingMode}</div>
              <div className="text-muted-foreground">Container #:</div>
              <div className="font-medium">{shipment.containerNumber || "-"}</div>
              <div className="text-muted-foreground">BOL #:</div>
              <div className="font-medium">{shipment.billOfLadingNumber || "-"}</div>
              <div className="text-muted-foreground">Carrier:</div>
              <div className="font-medium">{shipment.carrierName || "-"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origin & Destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">Origin Port:</div>
              <div className="font-medium">{shipment.originPort || "-"}</div>
              <div className="text-muted-foreground">Destination Port:</div>
              <div className="font-medium">{shipment.destinationPort || "-"}</div>
              <div className="text-muted-foreground">Origin Country:</div>
              <div className="font-medium">{shipment.originCountry || "-"}</div>
              <div className="text-muted-foreground">Destination Country:</div>
              <div className="font-medium">{shipment.destinationCountry || "-"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">Departure:</div>
              <div className="font-medium">{formatDate(shipment.departureDate)}</div>
              <div className="text-muted-foreground">Estimated Arrival:</div>
              <div className="font-medium">{formatDate(shipment.estimatedArrivalDate)}</div>
              <div className="text-muted-foreground">Actual Arrival:</div>
              <div className="font-medium">{formatDate(shipment.actualArrivalDate)}</div>
              <div className="text-muted-foreground">Clearance Date:</div>
              <div className="font-medium">{formatDate(shipment.clearanceDate)}</div>
              <div className="text-muted-foreground">Received Date:</div>
              <div className="font-medium">{formatDate(shipment.receivedDate)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">FOB Value:</div>
              <div className="font-medium">{formatCurrency(shipment.fobValueCents)}</div>
              <div className="text-muted-foreground">Freight:</div>
              <div className="font-medium">{formatCurrency(shipment.freightCostCents)}</div>
              <div className="text-muted-foreground">Insurance:</div>
              <div className="font-medium">{formatCurrency(shipment.insuranceCostCents)}</div>
              <div className="text-muted-foreground">Customs Duty:</div>
              <div className="font-medium">{formatCurrency(shipment.customsDutyCents)}</div>
              <div className="text-muted-foreground">Customs Tax:</div>
              <div className="font-medium">{formatCurrency(shipment.customsTaxCents)}</div>
              <div className="text-muted-foreground">Other Costs:</div>
              <div className="font-medium">{formatCurrency(shipment.otherCostsCents)}</div>
              <div className="text-muted-foreground font-semibold">Total Landed Cost:</div>
              <div className="font-bold">{formatCurrency(shipment.totalLandedCostCents)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipment Lines ({shipment.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Product ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">HS Code</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Ordered Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Received Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Unit FOB Cost</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Line FOB Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shipment.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-sm">{line.productId}</td>
                    <td className="px-4 py-3 text-sm">{line.hsCode || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">{line.orderedQty}</td>
                    <td className="px-4 py-3 text-sm text-right">{line.receivedQty}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(line.unitFobCostCents)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(line.lineFobCostCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
