import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminDirectory,
  createIdempotencyKey,
  type ApiError,
  type DirectoryAdminRequestOptions,
} from "@corely/api-client";
import type {
  AdminDirectoryRestaurantListQuery,
  CreateAdminDirectoryRestaurantRequest,
  UpdateAdminDirectoryRestaurantRequest,
  SetRestaurantStatusRequest,
} from "@corely/contracts";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export const adminDirectoryRestaurantKeys = {
  list: (params: AdminDirectoryRestaurantListQuery) =>
    ["adminDirectoryRestaurants", "list", params] as const,
  detail: (id: string) => ["adminDirectoryRestaurants", id] as const,
};

const useRequestOptions = (): DirectoryAdminRequestOptions | null => {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  return useMemo(() => {
    const accessToken = authClient.getAccessToken();
    const tenantId = user?.activeTenantId ?? null;
    const workspaceId = activeWorkspaceId ?? user?.activeWorkspaceId ?? null;

    if (!accessToken || !tenantId || !workspaceId) {
      return null;
    }

    return {
      accessToken,
      tenantId,
      workspaceId,
    } satisfies DirectoryAdminRequestOptions;
  }, [user?.activeTenantId, user?.activeWorkspaceId, activeWorkspaceId]);
};

export const useAdminDirectoryRestaurants = (params: AdminDirectoryRestaurantListQuery) => {
  const requestOptions = useRequestOptions();

  return useQuery({
    queryKey: adminDirectoryRestaurantKeys.list(params),
    queryFn: async () => {
      if (!requestOptions) {
        throw new Error("Missing auth workspace context");
      }
      return adminDirectory.listRestaurants(params, requestOptions);
    },
    enabled: Boolean(requestOptions),
  });
};

export const useAdminDirectoryRestaurant = (id: string | undefined) => {
  const requestOptions = useRequestOptions();

  return useQuery({
    queryKey: adminDirectoryRestaurantKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) {
        throw new Error("Restaurant id is required");
      }
      if (!requestOptions) {
        throw new Error("Missing auth workspace context");
      }
      return adminDirectory.getRestaurant(id, requestOptions);
    },
    enabled: Boolean(id && requestOptions),
  });
};

export const useCreateAdminDirectoryRestaurant = () => {
  const requestOptions = useRequestOptions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdminDirectoryRestaurantRequest) => {
      if (!requestOptions) {
        throw new Error("Missing auth workspace context");
      }

      return adminDirectory.createRestaurant(input, {
        ...requestOptions,
        idempotencyKey: createIdempotencyKey(),
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["adminDirectoryRestaurants", "list"],
      });
      await queryClient.invalidateQueries({
        queryKey: adminDirectoryRestaurantKeys.detail(response.restaurant.id),
      });
    },
  });
};

export const useUpdateAdminDirectoryRestaurant = () => {
  const requestOptions = useRequestOptions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: UpdateAdminDirectoryRestaurantRequest;
    }) => {
      if (!requestOptions) {
        throw new Error("Missing auth workspace context");
      }

      return adminDirectory.updateRestaurant(id, patch, requestOptions);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["adminDirectoryRestaurants", "list"],
      });
      await queryClient.invalidateQueries({
        queryKey: adminDirectoryRestaurantKeys.detail(response.restaurant.id),
      });
    },
  });
};

export const useSetAdminDirectoryRestaurantStatus = () => {
  const requestOptions = useRequestOptions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: SetRestaurantStatusRequest["status"];
    }) => {
      if (!requestOptions) {
        throw new Error("Missing auth workspace context");
      }

      return adminDirectory.setRestaurantStatus(id, status, requestOptions);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["adminDirectoryRestaurants", "list"],
      });
      await queryClient.invalidateQueries({
        queryKey: adminDirectoryRestaurantKeys.detail(response.restaurant.id),
      });
    },
  });
};

export const getApiErrorDetail = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "detail" in error) {
    return String((error as ApiError).detail ?? "Request failed");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed";
};
