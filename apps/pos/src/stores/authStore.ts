import { create } from "zustand";
import { AuthClient } from "@corely/auth-client";
import { PosApiClient } from "@/lib/pos-api-client";
import { NativeStorageAdapter } from "@/lib/storage-adapter";
import { secureDeleteItem, secureGetItem, secureSetItem } from "@/lib/secure-store";
import { router } from "expo-router";

interface User {
  userId: string;
  workspaceId: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  authClient: AuthClient | null;
  apiClient: PosApiClient | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const storage = new NativeStorageAdapter();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initialized: false,
  authClient: null,
  apiClient: null,

  initialize: async () => {
    try {
      // Create shared auth client
      const authClient = new AuthClient({
        apiUrl: API_URL,
        storage,
      });

      // Load stored tokens
      await authClient.loadStoredTokens();

      // Create POS API client
      const apiClient = new PosApiClient({
        apiUrl: API_URL,
        authClient,
        storage,
        onAuthError: () => {
          void get().logout();
        },
      });

      // Check if user is authenticated
      const accessToken = authClient.getAccessToken();
      const userJson = await secureGetItem("user");

      if (accessToken && userJson) {
        const user = JSON.parse(userJson);
        set({
          user,
          isAuthenticated: true,
          initialized: true,
          authClient,
          apiClient,
        });
      } else {
        set({ initialized: true, authClient, apiClient });
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      set({ initialized: true });
    }
  },

  login: async (email: string, password: string) => {
    let authClient = get().authClient;
    if (!authClient) {
      await get().initialize();
      authClient = get().authClient;
    }
    if (!authClient) {
      const fallbackAuthClient = new AuthClient({
        apiUrl: API_URL,
        storage,
      });
      const fallbackApiClient = new PosApiClient({
        apiUrl: API_URL,
        authClient: fallbackAuthClient,
        storage,
        onAuthError: () => {
          void get().logout();
        },
      });
      set({
        authClient: fallbackAuthClient,
        apiClient: fallbackApiClient,
      });
      authClient = fallbackAuthClient;
    }

    set({ isLoading: true });
    try {
      const data = await authClient.signin({ email, password });

      const user: User = {
        userId: data.userId,
        workspaceId: data.workspaceId || data.tenantId || "",
        email: data.email,
      };

      await secureSetItem("user", JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const { authClient } = get();

    if (authClient) {
      await authClient.signout();
    }

    await secureDeleteItem("user");

    set({
      user: null,
      isAuthenticated: false,
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login" as never);
    }
  },
}));
