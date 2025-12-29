import type {
  CreateRegisterInput,
  CreateRegisterOutput,
  ListRegistersInput,
  ListRegistersOutput,
  OpenShiftInput,
  OpenShiftOutput,
  CloseShiftInput,
  CloseShiftOutput,
  GetCurrentShiftInput,
  GetCurrentShiftOutput,
  SyncPosSaleInput,
  SyncPosSaleOutput,
  GetCatalogSnapshotInput,
  GetCatalogSnapshotOutput,
} from '@kerniflow/contracts';

interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string>;
  onAuthError: () => void;
}

export class PosApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.config.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      try {
        const newToken = await this.config.refreshAccessToken();
        // Retry request with new token
        const retryResponse = await fetch(`${this.config.baseUrl}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}`);
        }

        return await retryResponse.json();
      } catch (error) {
        this.config.onAuthError();
        throw error;
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      userId: string;
      workspaceId: string;
      email: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Register management
  async createRegister(input: CreateRegisterInput): Promise<CreateRegisterOutput> {
    return this.request<CreateRegisterOutput>('/pos/registers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listRegisters(input: ListRegistersInput): Promise<ListRegistersOutput> {
    const params = new URLSearchParams();
    if (input.status) params.append('status', input.status);
    const query = params.toString();

    return this.request<ListRegistersOutput>(
      `/pos/registers${query ? `?${query}` : ''}`
    );
  }

  // Shift management
  async openShift(input: OpenShiftInput): Promise<OpenShiftOutput> {
    return this.request<OpenShiftOutput>('/pos/shifts/open', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async closeShift(input: CloseShiftInput): Promise<CloseShiftOutput> {
    return this.request<CloseShiftOutput>('/pos/shifts/close', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getCurrentShift(input: GetCurrentShiftInput): Promise<GetCurrentShiftOutput> {
    const params = new URLSearchParams({
      registerId: input.registerId,
    });

    return this.request<GetCurrentShiftOutput>(
      `/pos/shifts/current?${params.toString()}`
    );
  }

  // Sales sync
  async syncPosSale(input: SyncPosSaleInput): Promise<SyncPosSaleOutput> {
    return this.request<SyncPosSaleOutput>('/pos/sales/sync', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // Catalog
  async getCatalogSnapshot(input: GetCatalogSnapshotInput): Promise<GetCatalogSnapshotOutput> {
    const params = new URLSearchParams();
    if (input.lastSyncAt) {
      params.append('lastSyncAt', input.lastSyncAt.toISOString());
    }

    return this.request<GetCatalogSnapshotOutput>(
      `/pos/catalog/snapshot${params.toString() ? `?${params.toString()}` : ''}`
    );
  }
}
