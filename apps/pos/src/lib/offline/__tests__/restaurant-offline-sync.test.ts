import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@corely/api-client";
import type {
  OpenRestaurantTableOutput,
  PutRestaurantDraftOrderOutput,
  SendRestaurantOrderToKitchenOutput,
} from "@corely/contracts";
import { PosCommandTypes } from "@/offline/posOutbox";
import type { PosApiClient } from "@/lib/pos-api-client";
import { PosSyncTransport } from "@/lib/offline/posSyncTransport";
import type { PosLocalService } from "@/services/posLocalService";
import { PosLocalServiceWeb } from "@/services/posLocalServiceWeb";

const FIXTURE_IDS = {
  workspaceId: "1d9620c1-ae09-4694-8ab8-f920bc7d6ef3",
  registerId: "14fbeb10-f86e-4927-b855-b4ac73be8f81",
  shiftSessionId: "935a9a72-bf45-4968-af73-a39c3a9ed8ae",
  cashierUserId: "3ec0d091-4937-4db0-b085-f9e74cbe8dcb",
  diningRoomId: "114fa663-cf0b-4d46-b9e5-07f7b353e5a8",
  tableId: "7937d894-c9c0-442e-97ba-e5b2e97eb99a",
  catalogItemId: "ec75c3f9-bc2d-4c3b-a7fd-0d8d10a7bbce",
  ticketId: "4c24aa63-2e73-44d8-a4fd-9f14be1d54df",
} as const;

function createApiClientStub(overrides: Partial<PosApiClient>): PosApiClient {
  return overrides as PosApiClient;
}

async function createOfflineRestaurantFlow(localService: PosLocalServiceWeb) {
  await localService.cacheRestaurantSnapshot(
    [
      {
        id: FIXTURE_IDS.diningRoomId,
        tenantId: FIXTURE_IDS.workspaceId,
        workspaceId: FIXTURE_IDS.workspaceId,
        name: "Main Room",
        sortOrder: 0,
        createdAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
        tables: [
          {
            id: FIXTURE_IDS.tableId,
            tenantId: FIXTURE_IDS.workspaceId,
            workspaceId: FIXTURE_IDS.workspaceId,
            diningRoomId: FIXTURE_IDS.diningRoomId,
            name: "T1",
            capacity: 4,
            posX: 12,
            posY: 14,
            shape: "SQUARE",
            availabilityStatus: "AVAILABLE",
            activeSessionId: null,
            activeOrderId: null,
            createdAt: "2026-03-24T10:00:00.000Z",
            updatedAt: "2026-03-24T10:00:00.000Z",
          },
        ],
      },
    ],
    [
      {
        id: "mod-group-1",
        tenantId: FIXTURE_IDS.workspaceId,
        workspaceId: FIXTURE_IDS.workspaceId,
        name: "Cheese",
        selectionMode: "MULTI",
        isRequired: false,
        sortOrder: 0,
        linkedCatalogItemIds: [FIXTURE_IDS.catalogItemId],
        options: [
          {
            id: "mod-option-1",
            name: "Extra Cheese",
            priceDeltaCents: 150,
            sortOrder: 0,
          },
        ],
        createdAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
      },
    ]
  );

  const open = await localService.openRestaurantTableAndEnqueue({
    workspaceId: FIXTURE_IDS.workspaceId,
    tableId: FIXTURE_IDS.tableId,
    registerId: FIXTURE_IDS.registerId,
    shiftSessionId: FIXTURE_IDS.shiftSessionId,
    openedByUserId: FIXTURE_IDS.cashierUserId,
  });

  const draft = await localService.replaceRestaurantDraftAndEnqueue({
    workspaceId: FIXTURE_IDS.workspaceId,
    orderId: open.order.id,
    discountCents: 0,
    items: [
      {
        catalogItemId: FIXTURE_IDS.catalogItemId,
        itemName: "Burger",
        sku: "BURG-001",
        quantity: 2,
        unitPriceCents: 1_200,
        taxRateBps: 1_000,
        modifiers: [
          {
            optionName: "Extra Cheese",
            modifierGroupId: "mod-group-1",
            quantity: 2,
            priceDeltaCents: 150,
          },
        ],
      },
    ],
  });

  const send = await localService.sendRestaurantOrderAndEnqueue({
    workspaceId: FIXTURE_IDS.workspaceId,
    orderId: open.order.id,
  });

  return { open, draft, send };
}

describe("restaurant offline queue", () => {
  it("captures open-table, draft updates, and send-to-kitchen locally, then syncs them with deterministic idempotency keys without duplicate application", async () => {
    const localService = new PosLocalServiceWeb();
    const { open, draft, send } = await createOfflineRestaurantFlow(localService);
    const snapshot = await localService.getRestaurantSnapshot();
    const aggregate = await localService.getRestaurantAggregateByTable(FIXTURE_IDS.tableId);
    const appliedKeys = new Set<string>();
    const serverApplications: string[] = [];

    const recordApplication = (key: string) => {
      if (!appliedKeys.has(key)) {
        appliedKeys.add(key);
        serverApplications.push(key);
      }
    };

    const openRestaurantTable = vi.fn(
      async (payload: { idempotencyKey: string }): Promise<OpenRestaurantTableOutput> => {
        recordApplication(payload.idempotencyKey);
        return {
          session: open.session,
          order: open.order,
        };
      }
    );
    const putRestaurantDraftOrder = vi.fn(
      async (payload: { idempotencyKey: string }): Promise<PutRestaurantDraftOrderOutput> => {
        recordApplication(payload.idempotencyKey);
        return {
          order: draft.order,
        };
      }
    );
    const sendRestaurantOrderToKitchen = vi.fn(
      async (payload: { idempotencyKey: string }): Promise<SendRestaurantOrderToKitchenOutput> => {
        recordApplication(payload.idempotencyKey);
        return {
          order: send.order,
          tickets: [
            {
              id: FIXTURE_IDS.ticketId,
              tenantId: FIXTURE_IDS.workspaceId,
              workspaceId: FIXTURE_IDS.workspaceId,
              orderId: send.order.id,
              tableSessionId: send.session.id,
              tableId: FIXTURE_IDS.tableId,
              stationId: null,
              status: "NEW",
              sentAt: send.order.sentAt ?? send.order.updatedAt,
              updatedAt: send.order.updatedAt,
              items: send.order.items.map((item) => ({
                id: `ticket-item-${item.id}`,
                orderItemId: item.id,
                itemName: item.itemName,
                quantity: item.quantity,
                modifiers: item.modifiers,
              })),
            },
          ],
        };
      }
    );

    const transport = new PosSyncTransport({
      apiClient: createApiClientStub({
        openRestaurantTable,
        putRestaurantDraftOrder,
        sendRestaurantOrderToKitchen,
      }),
      posLocalService: localService as unknown as PosLocalService,
    });

    expect(snapshot.rooms[0]?.tables[0]).toMatchObject({
      availabilityStatus: "OCCUPIED",
      activeSessionId: open.session.id,
      activeOrderId: open.order.id,
    });
    expect(open.command.type).toBe(PosCommandTypes.RestaurantTableOpen);
    expect(draft.command.type).toBe(PosCommandTypes.RestaurantDraftReplace);
    expect(send.command.type).toBe(PosCommandTypes.RestaurantSendToKitchen);
    expect(draft.command.idempotencyKey).toBe(`restaurant:${open.order.id}:draft:v1`);
    expect(send.command.idempotencyKey).toBe(`restaurant:${open.order.id}:send:v2`);
    expect(draft.order.subtotalCents).toBe(2_700);
    expect(draft.order.taxCents).toBe(270);
    expect(draft.order.totalCents).toBe(2_970);
    expect(send.order.status).toBe("SENT");
    expect(send.order.items[0]?.sentQuantity).toBe(2);
    expect(aggregate?.syncStatus).toBe("PENDING");

    const openFirst = await transport.executeCommand(open.command);
    const openDuplicate = await transport.executeCommand(open.command);
    const draftResult = await transport.executeCommand(draft.command);
    const sendFirst = await transport.executeCommand(send.command);
    const sendDuplicate = await transport.executeCommand(send.command);
    const syncedAggregate = await localService.getRestaurantAggregateByTable(FIXTURE_IDS.tableId);

    expect(openFirst.status).toBe("OK");
    expect(openDuplicate.status).toBe("OK");
    expect(draftResult.status).toBe("OK");
    expect(sendFirst.status).toBe("OK");
    expect(sendDuplicate.status).toBe("OK");
    expect(openRestaurantTable).toHaveBeenCalledTimes(2);
    expect(sendRestaurantOrderToKitchen).toHaveBeenCalledTimes(2);
    expect(serverApplications).toEqual([
      open.command.idempotencyKey,
      draft.command.idempotencyKey,
      send.command.idempotencyKey,
    ]);
    expect(syncedAggregate?.syncStatus).toBe("SYNCED");
    expect(syncedAggregate?.lastError).toBeNull();
    expect(syncedAggregate?.order.status).toBe("SENT");
  });

  it("surfaces restaurant sync conflicts explicitly when queued kitchen send cannot be applied safely", async () => {
    const localService = new PosLocalServiceWeb();
    const { open, draft, send } = await createOfflineRestaurantFlow(localService);

    const transport = new PosSyncTransport({
      apiClient: createApiClientStub({
        openRestaurantTable: vi.fn(async () => ({
          session: open.session,
          order: open.order,
        })),
        putRestaurantDraftOrder: vi.fn(async () => ({
          order: draft.order,
        })),
        sendRestaurantOrderToKitchen: vi.fn(async () => {
          throw new HttpError("Conflict", 409, {
            type: "https://errors.corely.one/Common:Conflict",
            title: "Conflict",
            status: 409,
            detail: "Kitchen send was already applied differently on the server",
            instance: `/api/restaurant/orders/${send.order.id}/send`,
            code: "Common:Conflict",
            traceId: "restaurant-offline-conflict-001",
          });
        }),
      }),
      posLocalService: localService as unknown as PosLocalService,
    });

    await transport.executeCommand(open.command);
    await transport.executeCommand(draft.command);
    const result = await transport.executeCommand(send.command);
    const aggregate = await localService.getRestaurantAggregateByTable(FIXTURE_IDS.tableId);

    expect(result.status).toBe("CONFLICT");
    expect(result.conflict?.message).toContain("Conflict");
    expect(result.conflict?.serverState).toMatchObject({
      code: "Common:Conflict",
      detail: "Kitchen send was already applied differently on the server",
    });
    expect(aggregate?.syncStatus).toBe("FAILED");
    expect(aggregate?.lastError).toContain("Conflict");
  });
});
