import { create } from "zustand";
import { persist } from "zustand/middleware";
import { portalApiRequest } from "../lib/portal-api-client";

interface PortalUser {
  userId: string;
  email: string;
  displayName: string;
  role: "GUARDIAN" | "STUDENT";
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: PortalUser | null;
  login: (token: string, user: PortalUser) => void;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      user: null,

      login: (token, user) =>
        set({
          isAuthenticated: true,
          accessToken: token,
          user,
        }),

      logout: async () => {
        try {
          await portalApiRequest({
            url: "/portal/auth/logout",
            method: "POST",
            body: {},
          });
        } catch {
          // Best effort logout
        }
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
        });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      refreshSession: async () => {
        try {
          const res: any = await portalApiRequest({
            url: "/portal/auth/refresh",
            method: "POST",
            body: {},
          });
          if (res.accessToken) {
            set({ accessToken: res.accessToken, isAuthenticated: true });
            return true;
          }
        } catch {
          set({
            isAuthenticated: false,
            accessToken: null,
            user: null,
          });
        }
        return false;
      },
    }),
    {
      name: "portal-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // accessToken intentionally NOT persisted - refreshed via HttpOnly cookie
      }),
    }
  )
);
