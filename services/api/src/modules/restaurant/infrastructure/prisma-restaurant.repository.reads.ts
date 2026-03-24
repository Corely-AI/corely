import { type PrismaService } from "@corely/data";
import type {
  FloorPlanRoom,
  ListRestaurantModifierGroupsInput,
  RestaurantModifierGroup,
} from "@corely/contracts";
import { mapModifierGroup } from "./prisma-restaurant.repository.mappers";

export async function listFloorPlanRecord(
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  roomId?: string
): Promise<FloorPlanRoom[]> {
  const rooms = await prisma.diningRoom.findMany({
    where: {
      tenantId,
      workspaceId,
      ...(roomId ? { id: roomId } : {}),
    },
    include: {
      tables: {
        orderBy: [{ posY: "asc" }, { posX: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const activeOrders = await prisma.restaurantOrder.findMany({
    where: {
      tenantId,
      workspaceId,
      status: { in: ["DRAFT", "PARTIALLY_SENT", "SENT", "PAID"] },
    },
    include: { session: true },
  });

  const activeByTable = new Map(
    activeOrders.map((order) => [
      order.tableId,
      { activeOrderId: order.id, activeSessionId: order.tableSessionId },
    ])
  );

  return rooms.map((room) => ({
    id: room.id,
    tenantId: room.tenantId,
    workspaceId: room.workspaceId,
    name: room.name,
    sortOrder: room.sortOrder,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    tables: room.tables.map((table) => {
      const active = activeByTable.get(table.id);
      const availabilityStatus =
        table.availabilityStatus === "OUT_OF_SERVICE" || table.availabilityStatus === "DIRTY"
          ? table.availabilityStatus
          : active
            ? "OCCUPIED"
            : "AVAILABLE";

      return {
        id: table.id,
        tenantId: table.tenantId,
        workspaceId: table.workspaceId,
        diningRoomId: table.diningRoomId,
        name: table.name,
        capacity: table.capacity,
        posX: table.posX,
        posY: table.posY,
        shape: table.shape,
        availabilityStatus,
        activeSessionId: active?.activeSessionId ?? null,
        activeOrderId: active?.activeOrderId ?? null,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
      };
    }),
  }));
}

export async function listModifierGroupsRecord(
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  input: ListRestaurantModifierGroupsInput
): Promise<{ items: RestaurantModifierGroup[]; total: number }> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  const [items, total] = await Promise.all([
    prisma.restaurantModifierGroup.findMany({
      where: { tenantId, workspaceId },
      include: {
        options: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        linkedCatalogIds: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.restaurantModifierGroup.count({ where: { tenantId, workspaceId } }),
  ]);
  return { items: items.map(mapModifierGroup), total };
}
