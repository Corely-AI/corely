import { create } from 'zustand';
import type { ShiftSession } from '@kerniflow/contracts';

interface ShiftState {
  currentShift: ShiftSession | null;
  isLoading: boolean;

  loadCurrentShift: (registerId: string) => Promise<void>;
  openShift: (data: {
    sessionId: string;
    registerId: string;
    startingCashCents: number | null;
  }) => Promise<void>;
  closeShift: (data: {
    closingCashCents: number | null;
  }) => Promise<void>;
  setCurrentShift: (shift: ShiftSession | null) => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  isLoading: false,

  loadCurrentShift: async (registerId: string) => {
    set({ isLoading: true });
    try {
      // TODO: Replace with actual API call
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/pos/shifts/current?registerId=${registerId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load current shift');
      }

      const data = await response.json();
      set({ currentShift: data.session, isLoading: false });
    } catch (error) {
      console.error('Failed to load current shift:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  openShift: async (data) => {
    set({ isLoading: true });
    try {
      // TODO: Replace with actual API call
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/pos/shifts/open`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to open shift');
      }

      const result = await response.json();
      set({
        currentShift: result.session,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  closeShift: async (data) => {
    const { currentShift } = get();
    if (!currentShift) {
      throw new Error('No active shift to close');
    }

    set({ isLoading: true });
    try {
      // TODO: Replace with actual API call
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/pos/shifts/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentShift.sessionId,
            ...data,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to close shift');
      }

      set({ currentShift: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentShift: (shift) => {
    set({ currentShift: shift });
  },
}));
