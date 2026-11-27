import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, LoadingSkeleton, TableLoadingSkeleton } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import type { LocationType } from "@corely/contracts";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function WarehousesPage() {
  const uiCopy = useUiCopy("ui.inventory-warehousespage");
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: inventoryQueryKeys.warehouses.list(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("INTERNAL");

  const {
    data: locations,
    isLoading: isLoadingLocations,
    isError: isLocationsError,
  } = useQuery({
    queryKey: selectedWarehouseId
      ? inventoryQueryKeys.warehouses.locations(selectedWarehouseId)
      : ["inventory", "locations"],
    queryFn: () => inventoryApi.listLocations(selectedWarehouseId || ""),
    enabled: Boolean(selectedWarehouseId),
  });

  const createWarehouse = useMutation({
    mutationFn: () => inventoryApi.createWarehouse({ name, address: address || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses.list() });
      setName("");
      setAddress("");
    },
  });

  const createLocation = useMutation({
    mutationFn: () =>
      inventoryApi.createLocation({
        warehouseId: selectedWarehouseId || "",
        name: locationName,
        locationType,
      }),
    onSuccess: () => {
      if (selectedWarehouseId) {
        void queryClient.invalidateQueries({
          queryKey: inventoryQueryKeys.warehouses.locations(selectedWarehouseId),
        });
      }
      setLocationName("");
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <h1 className="text-h1 text-foreground">{uiCopy("warehouses")}</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{uiCopy("name")}</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("address")}</Label>
              <Input value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                variant="accent"
                onClick={() => createWarehouse.mutate()}
                disabled={!name || createWarehouse.isPending}
              >
                {uiCopy("create-warehouse")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="space-y-2">
              {isLoading ? (
                <LoadingSkeleton label={t("common.loading")} variant="list" />
              ) : isError && !data ? (
                <p role="alert" className="text-destructive">
                  {t("common.error")}
                </p>
              ) : null}
              {data?.items.map((warehouse) => (
                <Button
                  key={warehouse.id}
                  variant={warehouse.id === selectedWarehouseId ? "accent" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setSelectedWarehouseId(warehouse.id)}
                >
                  {warehouse.name}
                  {warehouse.isDefault ? (
                    <span className="text-xs">{uiCopy("default")}</span>
                  ) : null}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{uiCopy("locations")}</h2>
            {selectedWarehouseId ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>{uiCopy("name")}</Label>
                    <Input
                      value={locationName}
                      onChange={(event) => setLocationName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{uiCopy("type")}</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={locationType}
                      onChange={(event) => setLocationType(event.target.value as LocationType)}
                    >
                      <option value="INTERNAL">{uiCopy("internal")}</option>
                      <option value="RECEIVING">{uiCopy("receiving")}</option>
                      <option value="SHIPPING">{uiCopy("shipping")}</option>
                      <option value="VIRTUAL">{uiCopy("virtual")}</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => createLocation.mutate()}
                      disabled={!locationName || createLocation.isPending}
                    >
                      {uiCopy("add-location")}
                    </Button>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2">{uiCopy("name")}</th>
                      <th>{uiCopy("type")}</th>
                      <th>{uiCopy("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLocations ? (
                      <TableLoadingSkeleton columns={3} label={t("common.loading")} />
                    ) : isLocationsError && !locations ? (
                      <tr>
                        <td colSpan={3}>
                          <p role="alert" className="text-destructive">
                            {t("common.error")}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                    {locations?.items.map((location) => (
                      <tr key={location.id} className="border-t border-border">
                        <td className="py-2 font-medium">{location.name}</td>
                        <td>{location.locationType}</td>
                        <td>{location.isActive ? uiCopy("active") : uiCopy("inactive")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{uiCopy("select-a-warehouse-to")}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
