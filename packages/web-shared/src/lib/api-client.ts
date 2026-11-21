/**
 * API Client
 * Web platform wrapper around @corely/auth-client ApiClient
 */

import { ApiClient } from "@corely/auth-client";
import { getTenantAdminSession } from "./tenant-admin-session";
import { authClient } from "./auth-client";
import { WebStorageAdapter } from "./storage-adapter";
import { defaultApiBaseUrl } from "./api-base-url";

const storage = new WebStorageAdapter();

// Get the underlying shared auth client from the wrapper
const sharedAuthClient = authClient.client;

// Create shared API client
const sharedApiClient = new ApiClient({
  apiUrl: defaultApiBaseUrl,
  authClient: sharedAuthClient,
  storage,
  onAuthError: () => {
    if (typeof window !== "undefined") {
      window.location.href = getTenantAdminSession() ? "/dashboard" : "/auth/login";
    }
  },
});

export const apiClient = sharedApiClient;
