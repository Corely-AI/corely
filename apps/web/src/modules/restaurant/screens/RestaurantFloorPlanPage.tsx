import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LoadingSkeleton,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { sonnerToast } from "@corely/ui";
import type { RestaurantTableShape } from "@corely/contracts";
import {
  useRestaurantFloorPlan,
  useUpsertDiningRoom,
  useUpsertRestaurantTable,
} from "../hooks/use-restaurant-admin";

const tableShapes: RestaurantTableShape[] = ["SQUARE", "ROUND", "RECTANGLE"];

export default function RestaurantFloorPlanPage() {
  const uiCopy = useUiCopy("ui.restaurant-restaurantfloorplanpage");
  const navigate = useNavigate();
  const floorPlan = useRestaurantFloorPlan();
  const createRoom = useUpsertDiningRoom();
  const createTable = useUpsertRestaurantTable();

  const [roomName, setRoomName] = useState("");
  const [roomSortOrder, setRoomSortOrder] = useState("0");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("");
  const [tableShape, setTableShape] = useState<RestaurantTableShape>("SQUARE");

  const rooms = floorPlan.data?.rooms ?? [];
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null,
    [rooms, selectedRoomId]
  );

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      return;
    }
    try {
      await createRoom.mutateAsync({
        name: roomName.trim(),
        sortOrder: Number(roomSortOrder) || 0,
      });
      setRoomName("");
      setRoomSortOrder("0");
      sonnerToast.success("Dining room saved");
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "Failed to save dining room");
    }
  };

  const handleCreateTable = async () => {
    if (!selectedRoom || !tableName.trim()) {
      return;
    }
    try {
      await createTable.mutateAsync({
        diningRoomId: selectedRoom.id,
        name: tableName.trim(),
        capacity: tableCapacity ? Number(tableCapacity) : null,
        shape: tableShape,
        availabilityStatus: "AVAILABLE",
      });
      setTableName("");
      setTableCapacity("");
      sonnerToast.success("Table saved");
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "Failed to save table");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {uiCopy("restaurant-floor-plan")}
        </h1>
        <p className="text-sm text-muted-foreground">{uiCopy("configure-dining-rooms-and")}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate("/restaurant/copilot")}>
            {uiCopy("open-restaurant-copilot")}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/pos/admin/registers">{uiCopy("manage-pos-registers")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px,1fr]">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">{uiCopy("add-dining-room")}</h2>
                <p className="text-sm text-muted-foreground">
                  {uiCopy("backoffice-setup-for-service")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurant-room-name">{uiCopy("name")}</Label>
                <Input
                  id="restaurant-room-name"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder={uiCopy("main-hall")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurant-room-order">{uiCopy("sort-order")}</Label>
                <Input
                  id="restaurant-room-order"
                  type="number"
                  value={roomSortOrder}
                  onChange={(event) => setRoomSortOrder(event.target.value)}
                />
              </div>
              <Button onClick={() => void handleCreateRoom()} disabled={createRoom.isPending}>
                {uiCopy("save-dining-room")}
              </Button>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">{uiCopy("add-table")}</h2>
                <p className="text-sm text-muted-foreground">
                  {uiCopy("tables-become-available-in")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{uiCopy("dining-room")}</Label>
                <Select
                  value={selectedRoom?.id ?? ""}
                  onValueChange={(value) => setSelectedRoomId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={uiCopy("choose-a-room")} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurant-table-name">{uiCopy("table-name")}</Label>
                <Input
                  id="restaurant-table-name"
                  value={tableName}
                  onChange={(event) => setTableName(event.target.value)}
                  placeholder="T12"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-table-capacity">{uiCopy("capacity")}</Label>
                  <Input
                    id="restaurant-table-capacity"
                    type="number"
                    value={tableCapacity}
                    onChange={(event) => setTableCapacity(event.target.value)}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{uiCopy("shape")}</Label>
                  <Select
                    value={tableShape}
                    onValueChange={(value) => setTableShape(value as RestaurantTableShape)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tableShapes.map((shape) => (
                        <SelectItem key={shape} value={shape}>
                          {shape}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => void handleCreateTable()}
                disabled={createTable.isPending || rooms.length === 0}
              >
                {uiCopy("save-table")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {floorPlan.isLoading ? (
            <LoadingSkeleton variant="cards" label={uiCopy("loading-floor-plan")} />
          ) : null}
          {!floorPlan.isLoading && rooms.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                {uiCopy("no-dining-rooms-configured")}
              </CardContent>
            </Card>
          ) : null}
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{room.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {room.tables.length}
                      {" " + uiCopy("table")}
                      {room.tables.length === 1 ? "" : uiCopy("s")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {uiCopy("sort") + " "}
                    {room.sortOrder}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {room.tables.map((table) => (
                    <div
                      key={table.id}
                      className="rounded-xl border border-border bg-muted/20 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-foreground">{table.name}</div>
                        <Badge
                          variant={table.availabilityStatus === "OCCUPIED" ? "default" : "outline"}
                        >
                          {table.availabilityStatus}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {uiCopy("capacity") + " "}
                        {table.capacity ?? "?"} · {table.shape}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {table.activeOrderId
                          ? `Active order ${table.activeOrderId.slice(0, 8)}`
                          : uiCopy("no-open-check")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
