import {
  CreateCustomFieldDefinitionSchema,
  EntityDimensionsSchema,
  EntityLayoutSchema,
  type CreateCustomFieldDefinition,
  type CreateDimensionTypeInput,
  type CreateDimensionValueInput,
  type CustomFieldDefinition,
  type CustomFieldFilter,
  type CustomizableEntityType,
  type DimensionFilter,
  type DimensionTypeDto,
  type DimensionValueDto,
  type EntityDimensionsDto,
  type EntityLayout,
  type UpdateCustomFieldDefinition,
  type UpdateDimensionTypeInput,
  type UpdateDimensionValueInput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

type EntityCustomFieldValuesResponse = {
  entityRef: {
    entityType: string;
    entityId: string;
  };
  values: Record<string, unknown>;
};

const CUSTOM_ATTRIBUTES_API_DISABLED = import.meta.env.VITE_DISABLE_CUSTOM_ATTRIBUTES === "true";

const isForbiddenError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  (error as { status?: unknown }).status === 403;

export const customAttributesApi = {
  async listDimensionTypes(appliesTo?: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return [];
    }
    const query = appliesTo ? `?appliesTo=${encodeURIComponent(appliesTo)}` : "";
    try {
      return await apiClient.get<DimensionTypeDto[]>(`/platform/dimensions/types${query}`);
    } catch (error) {
      if (isForbiddenError(error)) {
        return [];
      }
      throw error;
    }
  },

  async createDimensionType(input: Omit<CreateDimensionTypeInput, "idempotencyKey">) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.post<DimensionTypeDto>(`/platform/dimensions/types`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async updateDimensionType(id: string, patch: UpdateDimensionTypeInput) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.patch<DimensionTypeDto>(`/platform/dimensions/types/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async deleteDimensionType(id: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.delete(`/platform/dimensions/types/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async listDimensionValues(typeId: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return [];
    }
    try {
      return await apiClient.get<DimensionValueDto[]>(
        `/platform/dimensions/types/${typeId}/values`
      );
    } catch (error) {
      if (isForbiddenError(error)) {
        return [];
      }
      throw error;
    }
  },

  async createDimensionValue(
    typeId: string,
    input: Omit<CreateDimensionValueInput, "idempotencyKey" | "typeId">
  ) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.post<DimensionValueDto>(`/platform/dimensions/types/${typeId}/values`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async updateDimensionValue(id: string, patch: UpdateDimensionValueInput) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.patch<DimensionValueDto>(`/platform/dimensions/values/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async deleteDimensionValue(id: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.delete(`/platform/dimensions/values/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async getEntityDimensions(entityType: string, entityId: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return EntityDimensionsSchema.parse({
        entityRef: { entityType, entityId },
        assignments: [],
      });
    }
    try {
      const response = await apiClient.get<EntityDimensionsDto>(
        `/platform/dimensions/entities/${entityType}/${entityId}`
      );
      return EntityDimensionsSchema.parse(response);
    } catch (error) {
      if (isForbiddenError(error)) {
        return EntityDimensionsSchema.parse({
          entityRef: { entityType, entityId },
          assignments: [],
        });
      }
      throw error;
    }
  },

  async setEntityDimensions(
    entityType: string,
    entityId: string,
    assignments: EntityDimensionsDto["assignments"]
  ) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return EntityDimensionsSchema.parse({
        entityRef: { entityType, entityId },
        assignments,
      });
    }
    const response = await apiClient.put<EntityDimensionsDto>(
      `/platform/dimensions/entities/${entityType}/${entityId}`,
      { assignments },
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return EntityDimensionsSchema.parse(response);
  },

  async getEntityCustomFieldValues(entityType: string, entityId: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return {
        entityRef: { entityType, entityId },
        values: {},
      };
    }
    try {
      return await apiClient.get<EntityCustomFieldValuesResponse>(
        `/platform/custom-fields/entities/${entityType}/${entityId}`
      );
    } catch (error) {
      if (isForbiddenError(error)) {
        return {
          entityRef: { entityType, entityId },
          values: {},
        };
      }
      throw error;
    }
  },

  async setEntityCustomFieldValues(
    entityType: string,
    entityId: string,
    values: Record<string, unknown>
  ) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return {
        entityRef: { entityType, entityId },
        values,
      };
    }
    return apiClient.put<EntityCustomFieldValuesResponse>(
      `/platform/custom-fields/entities/${entityType}/${entityId}`,
      { values },
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  },

  async listIndexedCustomFields(entityType: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return [];
    }
    try {
      return await apiClient.get<
        Array<{ fieldId: string; key: string; label: string; type: string }>
      >(`/platform/custom-fields/indexed?entityType=${encodeURIComponent(entityType)}`);
    } catch (error) {
      if (isForbiddenError(error)) {
        return [];
      }
      throw error;
    }
  },

  async resolveEntityIdsByCustomFieldFilters(entityType: string, filters: CustomFieldFilter[]) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return [];
    }
    const encoded = encodeURIComponent(JSON.stringify(filters));
    const response = await apiClient.get<{ entityIds: string[] }>(
      `/platform/custom-fields/resolve-entity-ids?entityType=${encodeURIComponent(entityType)}&filters=${encoded}`
    );
    return response.entityIds;
  },

  async listCustomFieldDefinitions(entityType: CustomizableEntityType) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return [];
    }
    try {
      return await apiClient.get<CustomFieldDefinition[]>(
        `/customization/custom-fields?entityType=${encodeURIComponent(entityType)}`
      );
    } catch (error) {
      if (isForbiddenError(error)) {
        return [];
      }
      throw error;
    }
  },

  async createCustomFieldDefinition(input: CreateCustomFieldDefinition) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    const parsed = CreateCustomFieldDefinitionSchema.parse(input);
    return apiClient.post<CustomFieldDefinition>(`/customization/custom-fields`, parsed, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async updateCustomFieldDefinition(id: string, patch: UpdateCustomFieldDefinition) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.put<CustomFieldDefinition>(`/customization/custom-fields/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async deleteCustomFieldDefinition(id: string) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      throw new Error("Custom attributes API is disabled in this app");
    }
    return apiClient.delete(`/customization/custom-fields/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async getCustomFieldLayout(entityType: CustomizableEntityType) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return null;
    }
    try {
      const response = await apiClient.get<EntityLayout | null>(
        `/customization/layouts/${entityType}`
      );
      return response ? EntityLayoutSchema.parse(response) : null;
    } catch (error) {
      if (isForbiddenError(error)) {
        return null;
      }
      throw error;
    }
  },

  async saveCustomFieldLayout(entityType: CustomizableEntityType, layout: EntityLayout["layout"]) {
    if (CUSTOM_ATTRIBUTES_API_DISABLED) {
      return EntityLayoutSchema.parse({ entityType, layout });
    }
    return apiClient.put<EntityLayout>(
      `/customization/layouts/${entityType}`,
      {
        entityType,
        layout,
      },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  },

  encodeDimensionFilters(filters: DimensionFilter[]) {
    return JSON.stringify(filters);
  },
};
