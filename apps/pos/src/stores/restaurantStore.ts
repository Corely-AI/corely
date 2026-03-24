import { v4 as uuidv4 } from "@lukeed/uuid";
import { Platform } from "react-native";
import { create } from "zustand";
import type {
  DraftRestaurantOrderItemInput,
  FloorPlanRoom,
  RestaurantModifierGroup,
  RestaurantOrder,
  RestaurantPaymentInput,
  TableSession,
} from "@corely/contracts";
import { useAuthStore } from "./authStore";
import { useRegisterStore } from "./registerStore";
import { useShiftStore } from "./shiftStore";
import { shouldQueueForOffline } from "@/lib/errors/offline-error-handler";
import { getPosLocalService } from "@/hooks/usePosLocalService";

interface RestaurantState {
  floorPlan: FloorPlanRoom[];
  modifierGroups: RestaurantModifierGroup[];
  activeSession: TableSession | null;
  activeOrder: RestaurantOrder | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  loadFloorPlan: () => Promise<void>;
  openOrResumeTable: (tableId: string) => Promise<void>;
  replaceDraft: (items: DraftRestaurantOrderItemInput[], discountCents?: number) => Promise<void>;
  sendToKitchen: () => Promise<void>;
  transferTable: (toTableId: string) => Promise<void>;
  requestVoid: (orderItemId: string, reason: string) => Promise<void>;
  requestDiscount: (amountCents: number, reason: string) => Promise<void>;
  closeOrder: (payments: RestaurantPaymentInput[]) => Promise<void>;
  resetActiveOrder: () => void;
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  floorPlan: [],
  modifierGroups: [],
  activeSession: null,
  activeOrder: null,
  isLoading: false,
  isMutating: false,
  error: null,

  loadFloorPlan: async () => {
    const apiClient = useAuthStore.getState().apiClient;
    const localService = await getPosLocalService();
    set({ isLoading: true, error: null });
    try {
      if (!apiClient) {
        const cached = await localService.getRestaurantSnapshot();
        set({
          floorPlan: cached.rooms,
          modifierGroups: cached.modifierGroups,
          isLoading: false,
        });
        return;
      }
      const [floorPlan, modifierGroups] = await Promise.all([
        apiClient.getRestaurantFloorPlan(),
        apiClient.listRestaurantModifierGroups(),
      ]);
      await localService.cacheRestaurantSnapshot(floorPlan.rooms, modifierGroups.items);
      const cached = Platform.OS === "web" ? null : await localService.getRestaurantSnapshot();
      set({
        floorPlan: cached?.rooms ?? floorPlan.rooms,
        modifierGroups: cached?.modifierGroups ?? modifierGroups.items,
        isLoading: false,
      });
    } catch (error) {
      if (Platform.OS !== "web" && shouldQueueForOffline(error, true)) {
        const cached = await localService.getRestaurantSnapshot();
        set({
          floorPlan: cached.rooms,
          modifierGroups: cached.modifierGroups,
          isLoading: false,
          error: null,
        });
        return;
      }
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load restaurant floor plan",
      });
      throw error;
    }
  },

  openOrResumeTable: async (tableId: string) => {
    const apiClient = useAuthStore.getState().apiClient;
    const user = useAuthStore.getState().user;
    const selectedRegister = useRegisterStore.getState().selectedRegister;
    const shift = useShiftStore.getState().currentShift;
    const localService = await getPosLocalService();
    if (!apiClient || !user) {
      if (!user) {
        throw new Error("POS session is not ready");
      }
    }

    set({ isMutating: true, error: null });
    try {
      if (Platform.OS !== "web") {
        const localCurrent = await localService.getRestaurantAggregateByTable(tableId);
        if (localCurrent) {
          set({
            activeSession: localCurrent.session,
            activeOrder: localCurrent.order,
            isMutating: false,
          });
          await get().loadFloorPlan();
          return;
        }
      }

      if (apiClient) {
        try {
          const current = await apiClient.getActiveRestaurantOrder(tableId);
          if (current.session && current.order) {
            if (Platform.OS !== "web") {
              await localService.upsertRestaurantAggregate(current.session, current.order);
            }
            set({
              activeSession: current.session,
              activeOrder: current.order,
              isMutating: false,
            });
            return;
          }
        } catch (error) {
          if (Platform.OS === "web" || !shouldQueueForOffline(error, true)) {
            throw error;
          }
        }
      }

      if (Platform.OS !== "web") {
        const opened = await localService.openRestaurantTableAndEnqueue({
          workspaceId: user.workspaceId,
          tableId,
          registerId: selectedRegister?.registerId ?? null,
          shiftSessionId: shift?.sessionId ?? null,
          openedByUserId: user.userId,
        });
        set({
          activeSession: opened.session,
          activeOrder: opened.order,
          isMutating: false,
        });
        await get().loadFloorPlan();
        return;
      }
      if (!apiClient) {
        throw new Error("API client not initialized");
      }

      const current = await apiClient.getActiveRestaurantOrder(tableId);
      if (current.session && current.order) {
        set({
          activeSession: current.session,
          activeOrder: current.order,
          isMutating: false,
        });
        return;
      }

      const opened = await apiClient.openRestaurantTable({
        tableSessionId: uuidv4(),
        orderId: uuidv4(),
        tableId,
        registerId: selectedRegister?.registerId ?? null,
        shiftSessionId: shift?.sessionId ?? null,
        idempotencyKey: `restaurant-open:${tableId}:${Date.now()}`,
      });
      set({
        activeSession: opened.session,
        activeOrder: opened.order,
        isMutating: false,
      });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to open table",
      });
      throw error;
    }
  },

  replaceDraft: async (items, discountCents = 0) => {
    const apiClient = useAuthStore.getState().apiClient;
    const user = useAuthStore.getState().user;
    const localService = await getPosLocalService();
    const order = get().activeOrder;
    if (!order) {
      throw new Error("No active restaurant order");
    }
    if (Platform.OS === "web" && !apiClient) {
      throw new Error("No active restaurant order");
    }
    if (Platform.OS !== "web" && !user) {
      throw new Error("POS session is not ready");
    }

    set({ isMutating: true, error: null });
    try {
      if (Platform.OS !== "web" && user) {
        const saved = await localService.replaceRestaurantDraftAndEnqueue({
          workspaceId: user.workspaceId,
          orderId: order.id,
          items,
          discountCents,
        });
        set({ activeSession: saved.session, activeOrder: saved.order, isMutating: false });
        await get().loadFloorPlan();
        return;
      }
      if (!apiClient) {
        throw new Error("API client not initialized");
      }
      const saved = await apiClient.putRestaurantDraftOrder({
        orderId: order.id,
        items,
        discountCents,
        idempotencyKey: `restaurant-draft:${order.id}:${Date.now()}`,
      });
      set({ activeOrder: saved.order, isMutating: false });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to save restaurant order",
      });
      throw error;
    }
  },

  sendToKitchen: async () => {
    const apiClient = useAuthStore.getState().apiClient;
    const user = useAuthStore.getState().user;
    const localService = await getPosLocalService();
    const order = get().activeOrder;
    if (!order) {
      throw new Error("No active restaurant order");
    }
    if (Platform.OS === "web" && !apiClient) {
      throw new Error("No active restaurant order");
    }
    if (Platform.OS !== "web" && !user) {
      throw new Error("POS session is not ready");
    }
    set({ isMutating: true, error: null });
    try {
      if (Platform.OS !== "web" && user) {
        const saved = await localService.sendRestaurantOrderAndEnqueue({
          workspaceId: user.workspaceId,
          orderId: order.id,
        });
        set({ activeSession: saved.session, activeOrder: saved.order, isMutating: false });
        await get().loadFloorPlan();
        return;
      }
      if (!apiClient) {
        throw new Error("API client not initialized");
      }
      const saved = await apiClient.sendRestaurantOrderToKitchen({
        orderId: order.id,
        idempotencyKey: `restaurant-send:${order.id}:${Date.now()}`,
      });
      set({ activeOrder: saved.order, isMutating: false });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to send to kitchen",
      });
      throw error;
    }
  },

  transferTable: async (toTableId: string) => {
    const apiClient = useAuthStore.getState().apiClient;
    const order = get().activeOrder;
    const session = get().activeSession;
    if (!apiClient || !order || !session) {
      throw new Error("Active restaurant session is required");
    }
    set({ isMutating: true, error: null });
    try {
      const moved = await apiClient.transferRestaurantTable({
        orderId: order.id,
        tableSessionId: session.id,
        toTableId,
        idempotencyKey: `restaurant-transfer:${order.id}:${toTableId}:${Date.now()}`,
      });
      set({
        activeSession: moved.session,
        activeOrder: moved.order,
        isMutating: false,
      });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to transfer table",
      });
      throw error;
    }
  },

  requestVoid: async (orderItemId: string, reason: string) => {
    const apiClient = useAuthStore.getState().apiClient;
    const order = get().activeOrder;
    if (!apiClient || !order) {
      throw new Error("Active restaurant order is required");
    }
    set({ isMutating: true, error: null });
    try {
      const response = await apiClient.requestRestaurantVoid({
        orderItemId,
        reason,
        idempotencyKey: `restaurant-void:${orderItemId}:${Date.now()}`,
      });
      set({ activeOrder: response.order, isMutating: false });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to request void",
      });
      throw error;
    }
  },

  requestDiscount: async (amountCents: number, reason: string) => {
    const apiClient = useAuthStore.getState().apiClient;
    const order = get().activeOrder;
    if (!apiClient || !order) {
      throw new Error("Active restaurant order is required");
    }
    set({ isMutating: true, error: null });
    try {
      const response = await apiClient.requestRestaurantDiscount({
        orderId: order.id,
        amountCents,
        reason,
        idempotencyKey: `restaurant-discount:${order.id}:${amountCents}:${Date.now()}`,
      });
      set({ activeOrder: response.order, isMutating: false });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to request discount",
      });
      throw error;
    }
  },

  closeOrder: async (payments) => {
    const apiClient = useAuthStore.getState().apiClient;
    const localService = await getPosLocalService();
    const session = get().activeSession;
    const order = get().activeOrder;
    if (!apiClient || !session || !order) {
      throw new Error("No active restaurant order");
    }
    set({ isMutating: true, error: null });
    try {
      if (!apiClient) {
        throw new Error("API client not initialized");
      }
      const closed = await apiClient.closeRestaurantTable({
        orderId: order.id,
        tableSessionId: session.id,
        payments,
        idempotencyKey: `restaurant-close:${order.id}:${Date.now()}`,
      });
      if (Platform.OS !== "web") {
        await localService.upsertRestaurantAggregate(closed.session, closed.order);
      }
      set({ activeOrder: null, activeSession: null, isMutating: false });
      await get().loadFloorPlan();
    } catch (error) {
      set({
        isMutating: false,
        error: error instanceof Error ? error.message : "Failed to close table",
      });
      throw error;
    }
  },

  resetActiveOrder: () => {
    set({ activeOrder: null, activeSession: null, error: null });
  },
}));
