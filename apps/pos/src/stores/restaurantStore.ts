import { v4 as uuidv4 } from "@lukeed/uuid";
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
    if (!apiClient) {
      throw new Error("API client not initialized");
    }
    set({ isLoading: true, error: null });
    try {
      const [floorPlan, modifierGroups] = await Promise.all([
        apiClient.getRestaurantFloorPlan(),
        apiClient.listRestaurantModifierGroups(),
      ]);
      set({
        floorPlan: floorPlan.rooms,
        modifierGroups: modifierGroups.items,
        isLoading: false,
      });
    } catch (error) {
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
    if (!apiClient || !user) {
      throw new Error("POS session is not ready");
    }

    set({ isMutating: true, error: null });
    try {
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
    const order = get().activeOrder;
    if (!apiClient || !order) {
      throw new Error("No active restaurant order");
    }

    set({ isMutating: true, error: null });
    try {
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
    const order = get().activeOrder;
    if (!apiClient || !order) {
      throw new Error("No active restaurant order");
    }
    set({ isMutating: true, error: null });
    try {
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

  closeOrder: async (payments) => {
    const apiClient = useAuthStore.getState().apiClient;
    const session = get().activeSession;
    const order = get().activeOrder;
    if (!apiClient || !session || !order) {
      throw new Error("No active restaurant order");
    }
    set({ isMutating: true, error: null });
    try {
      await apiClient.closeRestaurantTable({
        orderId: order.id,
        tableSessionId: session.id,
        payments,
        idempotencyKey: `restaurant-close:${order.id}:${Date.now()}`,
      });
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
