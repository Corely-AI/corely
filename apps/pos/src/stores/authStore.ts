import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { PosApiClient } from '@/services/apiClient';

interface User {
  userId: string;
  workspaceId: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  apiClient: PosApiClient | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  refreshAccessToken: () => Promise<string>;
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  initialized: false,
  apiClient: null,

  getAccessToken: async () => {
    return get().accessToken;
  },

  refreshAccessToken: async () => {
    const { refreshToken, apiClient, logout } = get();
    if (!refreshToken || !apiClient) {
      throw new Error('No refresh token available');
    }

    try {
      const result = await apiClient.refreshToken(refreshToken);
      await get().setTokens(result.accessToken, result.refreshToken);
      return result.accessToken;
    } catch (error) {
      await logout();
      throw error;
    }
  },

  initialize: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userJson = await SecureStore.getItemAsync('user');

      // Initialize API client
      const apiClient = new PosApiClient({
        baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
        getAccessToken: () => get().getAccessToken(),
        refreshAccessToken: () => get().refreshAccessToken(),
        onAuthError: () => get().logout(),
      });

      if (accessToken && refreshToken && userJson) {
        const user = JSON.parse(userJson);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          initialized: true,
          apiClient,
        });
      } else {
        set({ initialized: true, apiClient });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ initialized: true });
    }
  },

  login: async (email: string, password: string) => {
    const { apiClient } = get();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    set({ isLoading: true });
    try {
      const data = await apiClient.login(email, password);
      const user: User = {
        userId: data.userId,
        workspaceId: data.workspaceId,
        email: data.email,
      };

      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      set({
        user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setTokens: async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },
}));
