import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomizableEntityType, EntityDimensionsDto, EntityRef } from "@corely/contracts";
import { customAttributesApi } from "@corely/web-shared/lib/custom-attributes-api";
import { withWorkspace } from "@corely/web-shared/shared/workspaces/workspace-query-keys";

export function useDimensionTypes(appliesTo?: string) {
  return useQuery({
    queryKey: withWorkspace(["custom-attributes", "dimensions", "types", appliesTo ?? "all"]),
    queryFn: () => customAttributesApi.listDimensionTypes(appliesTo),
  });
}

export function useDimensionValues(typeId?: string) {
  return useQuery({
    queryKey: withWorkspace(["custom-attributes", "dimensions", "values", typeId ?? "none"]),
    queryFn: () => customAttributesApi.listDimensionValues(typeId!),
    enabled: Boolean(typeId),
  });
}

export function useEntityDimensions(entityRef?: EntityRef) {
  return useQuery({
    queryKey: withWorkspace([
      "custom-attributes",
      "dimensions",
      "entity",
      entityRef?.entityType ?? "none",
      entityRef?.entityId ?? "none",
    ]),
    queryFn: () =>
      customAttributesApi.getEntityDimensions(entityRef!.entityType, entityRef!.entityId),
    enabled: Boolean(entityRef?.entityType && entityRef?.entityId),
  });
}

export function useSaveEntityDimensions(entityRef: EntityRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignments: EntityDimensionsDto["assignments"]) =>
      customAttributesApi.setEntityDimensions(
        entityRef.entityType,
        entityRef.entityId,
        assignments
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: withWorkspace([
          "custom-attributes",
          "dimensions",
          "entity",
          entityRef.entityType,
          entityRef.entityId,
        ]),
      });
    },
  });
}

export function useCustomFieldDefinitions(entityType?: CustomizableEntityType) {
  return useQuery({
    queryKey: withWorkspace([
      "custom-attributes",
      "custom-fields",
      "definitions",
      entityType ?? "none",
    ]),
    queryFn: () => customAttributesApi.listCustomFieldDefinitions(entityType!),
    enabled: Boolean(entityType),
  });
}

export function useCustomFieldLayout(entityType?: CustomizableEntityType) {
  return useQuery({
    queryKey: withWorkspace(["custom-attributes", "custom-fields", "layout", entityType ?? "none"]),
    queryFn: () => customAttributesApi.getCustomFieldLayout(entityType!),
    enabled: Boolean(entityType),
  });
}

export function useEntityCustomFieldValues(entityRef?: EntityRef) {
  return useQuery({
    queryKey: withWorkspace([
      "custom-attributes",
      "custom-fields",
      "entity",
      entityRef?.entityType ?? "none",
      entityRef?.entityId ?? "none",
    ]),
    queryFn: () =>
      customAttributesApi.getEntityCustomFieldValues(entityRef!.entityType, entityRef!.entityId),
    enabled: Boolean(entityRef?.entityType && entityRef?.entityId),
  });
}

export function useSaveEntityCustomFieldValues(entityRef: EntityRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      customAttributesApi.setEntityCustomFieldValues(
        entityRef.entityType,
        entityRef.entityId,
        values
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: withWorkspace([
          "custom-attributes",
          "custom-fields",
          "entity",
          entityRef.entityType,
          entityRef.entityId,
        ]),
      });
    },
  });
}
