import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: any | null;
  tenantId: string | null;
  login: (token: string, user: any, tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      user: null,
      tenantId: null,
      login: (token, user, tenantId) =>
        set({
          isAuthenticated: true,
          accessToken: token,
          user,
          tenantId,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
          tenantId: null,
        }),
    }),
    {
      name: "portal-auth",
    }
  )
);
