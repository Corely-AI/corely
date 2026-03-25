import React, { useState } from "react";
import { Badge, Button, Card, CardContent, Input, Label } from "@corely/ui";
import { sonnerToast } from "@corely/ui";
import { useKitchenStations, useUpsertKitchenStation } from "../hooks/use-restaurant-admin";

export default function RestaurantKitchenStationsPage() {
  const stationsQuery = useKitchenStations();
  const saveStation = useUpsertKitchenStation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const submit = async () => {
    if (!name.trim() || !code.trim()) {
      return;
    }
    try {
      await saveStation.mutateAsync({
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });
      setName("");
      setCode("");
      sonnerToast.success("Kitchen station saved");
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "Failed to save kitchen station");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Kitchen stations</h1>
        <p className="text-sm text-muted-foreground">
          Configure production stations used when restaurant orders are sent to kitchen.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="station-name">Name</Label>
              <Input
                id="station-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Hot line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-code">Code</Label>
              <Input
                id="station-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="HOT"
              />
            </div>
            <Button onClick={() => void submit()} disabled={saveStation.isPending}>
              Save station
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {stationsQuery.data?.items.map((station) => (
            <Card key={station.id}>
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-foreground">{station.name}</h2>
                  <Badge variant="secondary">{station.code}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{station.id}</p>
              </CardContent>
            </Card>
          ))}
          {!stationsQuery.isLoading && (stationsQuery.data?.items.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No kitchen stations configured yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
