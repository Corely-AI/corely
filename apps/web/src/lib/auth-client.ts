/**
 * Auth Client
 * Handles HTTP calls to API auth endpoints
 */

// Vite exposes env via import.meta.env, so avoid process.env on the client
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface SignUpData {
  email: string;
  password: string;
  tenantName: string;
  userName?: string;
}

export interface SignInData {
  email: string;
  password: string;
  tenantId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  tenantId: string;
}

export interface CurrentUserResponse {
  userId: string;
  email: string;
  name: string | null;
  activeTenantId: string;
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    roleId: string;
  }>;
}

class AuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Initialize from stored tokens
   */
  loadStoredTokens(): void {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken");
      this.refreshToken = localStorage.getItem("refreshToken");
    }
  }

  /**
   * Store tokens
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Sign up
   */
  async signup(data: SignUpData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": this.generateIdempotencyKey(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Signup failed");
    }

    const result = (await response.json()) as AuthResponse;
    this.storeTokens(result.accessToken, result.refreshToken);

    return result;
  }

  /**
   * Sign in
   */
  async signin(data: SignInData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Sign in failed");
    }

    const result = (await response.json()) as AuthResponse;
    this.storeTokens(result.accessToken, result.refreshToken);

    return result;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    if (!this.accessToken) {
      throw new Error("No access token");
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.getCurrentUser(); // Retry
      }
      throw new Error("Failed to fetch user");
    }

    return (await response.json()) as CurrentUserResponse;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token");
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error("Token refresh failed");
    }

    const result = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    this.storeTokens(result.accessToken, result.refreshToken);
  }

  /**
   * Sign out
   */
  async signout(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (error) {
        // Ignore errors on logout
      }
    }

    this.clearTokens();
  }

  /**
   * Switch tenant
   */
  async switchTenant(tenantId: string): Promise<AuthResponse> {
    if (!this.accessToken) {
      throw new Error("No access token");
    }

    const response = await fetch(`${API_URL}/auth/switch-tenant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tenantId }),
    });

    if (!response.ok) {
      throw new Error("Failed to switch tenant");
    }

    const result = (await response.json()) as AuthResponse;
    this.storeTokens(result.accessToken, result.refreshToken);

    return result;
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export const authClient = new AuthClient();
