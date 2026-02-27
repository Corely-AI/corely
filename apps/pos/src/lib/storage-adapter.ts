import type { TokenStorage } from "@corely/auth-client";
import { secureDeleteItem, secureGetItem, secureSetItem } from "@/lib/secure-store";

/**
 * Native Storage Adapter
 * React Native implementation using expo-secure-store
 */
export class NativeStorageAdapter implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";
  private readonly WORKSPACE_ID_KEY = "activeWorkspaceId";

  async setAccessToken(token: string): Promise<void> {
    await secureSetItem(this.ACCESS_TOKEN_KEY, token);
  }

  async getAccessToken(): Promise<string | null> {
    return await secureGetItem(this.ACCESS_TOKEN_KEY);
  }

  async setRefreshToken(token: string): Promise<void> {
    await secureSetItem(this.REFRESH_TOKEN_KEY, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return await secureGetItem(this.REFRESH_TOKEN_KEY);
  }

  async setActiveWorkspaceId(workspaceId: string | null): Promise<void> {
    if (workspaceId) {
      await secureSetItem(this.WORKSPACE_ID_KEY, workspaceId);
    } else {
      await secureDeleteItem(this.WORKSPACE_ID_KEY);
    }
  }

  async getActiveWorkspaceId(): Promise<string | null> {
    return await secureGetItem(this.WORKSPACE_ID_KEY);
  }

  async clear(): Promise<void> {
    await secureDeleteItem(this.ACCESS_TOKEN_KEY);
    await secureDeleteItem(this.REFRESH_TOKEN_KEY);
    await secureDeleteItem(this.WORKSPACE_ID_KEY);
  }
}
