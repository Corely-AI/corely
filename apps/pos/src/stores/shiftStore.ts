import { create } from "zustand";
import type { ShiftSession } from "@corely/contracts";
import { useAuthStore } from "./authStore";
import { getPosLocalService } from "@/hooks/usePosLocalService";
import type { ShiftCashEventType } from "@/offline/posOutbox";

export interface ShiftCashEvent {
  eventId: string;
  eventType: ShiftCashEventType;
  amountCents: number;
  reason: string | null;
  occurredAt: Date;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  lastError: string | null;
}

interface ShiftState {
  currentShift: ShiftSession | null;
  cashEvents: ShiftCashEvent[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  loadCurrentShift: (registerId: string) => Promise<void>;
  openShift: (data: {
    registerId: string;
    startingCashCents: number | null;
    notes?: string;
  }) => Promise<void>;
  closeShift: (data: { closingCashCents: number | null; notes?: string }) => Promise<void>;
  addCashEvent: (input: {
    eventType: ShiftCashEventType;
    amountCents: number;
    reason: string | null;
  }) => Promise<void>;
  refreshCashEvents: () => Promise<void>;
  setCurrentShift: (shift: ShiftSession | null) => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  cashEvents: [],
  isLoading: false,
  isMutating: false,
  error: null,

  loadCurrentShift: async (registerId: string) => {
    const apiClient = useAuthStore.getState().apiClient;
    const localService = await getPosLocalService();

    set({ isLoading: true, error: null });
    try {
      const localShift = await localService.getCurrentOpenShift(registerId);
      if (localShift) {
        set({ currentShift: localShift, isLoading: false });
        await get().refreshCashEvents();
        return;
      }

      if (!apiClient) {
        set({ currentShift: null, isLoading: false });
        return;
      }

      const data = await apiClient.getCurrentShift({ registerId });
      if (data.session) {
        await localService.upsertShiftSession(data.session);
      }
      set({ currentShift: data.session ?? null, isLoading: false });
      await get().refreshCashEvents();
    } catch (error) {
      console.error("Failed to load current shift:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load shift",
      });
      throw error;
    }
  },

  openShift: async (data) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    set({ isMutating: true, isLoading: true, error: null });
    try {
      const localService = await getPosLocalService();
      const openPayload: {
        workspaceId: string;
        registerId: string;
        openedByEmployeePartyId: string;
        startingCashCents: number | null;
        notes?: string;
      } = {
        workspaceId: user.workspaceId,
        registerId: data.registerId,
        openedByEmployeePartyId: user.userId,
        startingCashCents: data.startingCashCents,
      };
      if (data.notes) {
        openPayload.notes = data.notes;
      }
      const shift = await localService.openShiftAndEnqueue({
        ...openPayload,
      });

      set({ currentShift: shift, isMutating: false, isLoading: false });
      await get().refreshCashEvents();
    } catch (error) {
      set({
        isMutating: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to open shift",
      });
      throw error;
    }
  },

  closeShift: async (data) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { currentShift } = get();
    if (!currentShift) {
      throw new Error("No active shift to close");
    }

    set({ isMutating: true, isLoading: true, error: null });
    try {
      const localService = await getPosLocalService();
      const closePayload: {
        sessionId: string;
        workspaceId: string;
        closedByEmployeePartyId: string;
        closingCashCents: number | null;
        notes?: string;
      } = {
        sessionId: currentShift.sessionId,
        workspaceId: user.workspaceId,
        closedByEmployeePartyId: user.userId,
        closingCashCents: data.closingCashCents,
      };
      if (data.notes) {
        closePayload.notes = data.notes;
      }

      await localService.closeShiftAndEnqueue(closePayload);

      set({ currentShift: null, cashEvents: [], isMutating: false, isLoading: false });
    } catch (error) {
      set({
        isMutating: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to close shift",
      });
      throw error;
    }
  },

  addCashEvent: async ({ eventType, amountCents, reason }) => {
    const user = useAuthStore.getState().user;
    const shift = get().currentShift;

    if (!user) {
      throw new Error("User not authenticated");
    }
    if (!shift) {
      throw new Error("No active shift");
    }

    set({ isMutating: true, isLoading: true, error: null });
    try {
      const localService = await getPosLocalService();
      await localService.createShiftCashEventAndEnqueue({
        sessionId: shift.sessionId,
        workspaceId: user.workspaceId,
        registerId: shift.registerId,
        createdByEmployeePartyId: user.userId,
        eventType,
        amountCents,
        reason,
      });
      await get().refreshCashEvents();
      set({ isMutating: false, isLoading: false });
    } catch (error) {
      set({
        isMutating: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to add cash event",
      });
      throw error;
    }
  },

  refreshCashEvents: async () => {
    const shift = get().currentShift;
    if (!shift) {
      set({ cashEvents: [] });
      return;
    }

    const localService = await getPosLocalService();
    const events = await localService.listShiftCashEvents(shift.sessionId);
    set({ cashEvents: events });
  },

  setCurrentShift: (shift) => {
    set({ currentShift: shift });
  },
}));
