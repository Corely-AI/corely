import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ship, Filter } from "lucide-react";
import { LoadingSkeleton, Card, CardContent, Badge, Button, Input, Label } from "@corely/ui";
import { importShipmentsApi } from "@/lib/import-shipments-api";
import { useNavigate } from "react-router-dom";
import type { ImportShipmentStatus } from "@corely/contracts";
import { hasPermission, useEffectivePermissions } from "@/shared/lib/permissions";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";

export default function ShipmentsPage() {
  const uiCopy = useUiCopy("ui.import-shipmentspage");
  const navigate = useNavigate();
  const { hasCapability } = useWorkspaceConfig();
  const { data: effectivePermissions } = useEffectivePermissions();
  const rbacEnabled = hasCapability("workspace.rbac");
  const canManageShipments =
    !rbacEnabled || hasPermission(effectivePermissions?.permissions, "import.shipments.manage");

  const [statusFilter, setStatusFilter] = useState<ImportShipmentStatus | "">("");
  const [containerFilter, setContainerFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    status: statusFilter || undefined,
    containerNumber: containerFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["import", "shipments", "list", queryParams],
    queryFn: () => importShipmentsApi.listShipments(queryParams),
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

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {uiCopy("import-shipments")}
            </p>
            <h1 className="text-h1 text-foreground">{uiCopy("import-shipments-2")}</h1>
            <p className="text-sm text-muted-foreground">
              {uiCopy("track-international-shipments-and")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? uiCopy("hide-filters") : uiCopy("show-filters")}
          </Button>
          {canManageShipments ? (
            <Button variant="accent" onClick={() => navigate("/import/shipments/new")}>
              {uiCopy("create-shipment")}
            </Button>
          ) : null}
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{uiCopy("status")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ImportShipmentStatus | "")}
                >
                  <option value="">{uiCopy("all")}</option>
                  <option value="DRAFT">{uiCopy("draft")}</option>
                  <option value="SUBMITTED">{uiCopy("submitted")}</option>
                  <option value="IN_TRANSIT">{uiCopy("in-transit")}</option>
                  <option value="CUSTOMS_CLEARANCE">{uiCopy("customs-clearance")}</option>
                  <option value="CLEARED">{uiCopy("cleared")}</option>
                  <option value="RECEIVED">{uiCopy("received")}</option>
                  <option value="CANCELED">{uiCopy("canceled")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{uiCopy("container-number")}</Label>
                <Input
                  placeholder={uiCopy("search-container")}
                  value={containerFilter}
                  onChange={(e) => setContainerFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingSkeleton variant="list" label={uiCopy("loading-shipments")} />
      ) : !data || data.shipments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{uiCopy("no-shipments-found")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      {uiCopy("shipment")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{uiCopy("status")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      {uiCopy("container")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{uiCopy("origin")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">ETA</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      {uiCopy("total-cost")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{uiCopy("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.shipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{shipment.shipmentNumber || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusColor(shipment.status)}>{shipment.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{shipment.containerNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm">{shipment.originPort || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(shipment.estimatedArrivalDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(shipment.totalLandedCostCents)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/import/shipments/${shipment.id}`)}
                        >
                          {uiCopy("view")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
