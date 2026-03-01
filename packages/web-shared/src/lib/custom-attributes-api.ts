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

export const customAttributesApi = {
  async listDimensionTypes(appliesTo?: string) {
    const query = appliesTo ? `?appliesTo=${encodeURIComponent(appliesTo)}` : "";
    return apiClient.get<DimensionTypeDto[]>(`/platform/dimensions/types${query}`);
  },

  async createDimensionType(input: Omit<CreateDimensionTypeInput, "idempotencyKey">) {
    return apiClient.post<DimensionTypeDto>(`/platform/dimensions/types`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async updateDimensionType(id: string, patch: UpdateDimensionTypeInput) {
    return apiClient.patch<DimensionTypeDto>(`/platform/dimensions/types/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async deleteDimensionType(id: string) {
    return apiClient.delete(`/platform/dimensions/types/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async listDimensionValues(typeId: string) {
    return apiClient.get<DimensionValueDto[]>(`/platform/dimensions/types/${typeId}/values`);
  },

  async createDimensionValue(
    typeId: string,
    input: Omit<CreateDimensionValueInput, "idempotencyKey" | "typeId">
  ) {
    return apiClient.post<DimensionValueDto>(`/platform/dimensions/types/${typeId}/values`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async updateDimensionValue(id: string, patch: UpdateDimensionValueInput) {
    return apiClient.patch<DimensionValueDto>(`/platform/dimensions/values/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async deleteDimensionValue(id: string) {
    return apiClient.delete(`/platform/dimensions/values/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async getEntityDimensions(entityType: string, entityId: string) {
    const response = await apiClient.get<EntityDimensionsDto>(
      `/platform/dimensions/entities/${entityType}/${entityId}`
    );
    return EntityDimensionsSchema.parse(response);
  },

  async setEntityDimensions(
    entityType: string,
    entityId: string,
    assignments: EntityDimensionsDto["assignments"]
  ) {
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
    return apiClient.get<EntityCustomFieldValuesResponse>(
      `/platform/custom-fields/entities/${entityType}/${entityId}`
    );
  },

  async setEntityCustomFieldValues(
    entityType: string,
    entityId: string,
    values: Record<string, unknown>
  ) {
    return apiClient.put<EntityCustomFieldValuesResponse>(
      `/platform/custom-fields/entities/${entityType}/${entityId}`,
      { values },
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  },

  async listIndexedCustomFields(entityType: string) {
    return apiClient.get<Array<{ fieldId: string; key: string; label: string; type: string }>>(
      `/platform/custom-fields/indexed?entityType=${encodeURIComponent(entityType)}`
    );
  },

  async resolveEntityIdsByCustomFieldFilters(entityType: string, filters: CustomFieldFilter[]) {
    const encoded = encodeURIComponent(JSON.stringify(filters));
    const response = await apiClient.get<{ entityIds: string[] }>(
      `/platform/custom-fields/resolve-entity-ids?entityType=${encodeURIComponent(entityType)}&filters=${encoded}`
    );
    return response.entityIds;
  },

  async listCustomFieldDefinitions(entityType: CustomizableEntityType) {
    return apiClient.get<CustomFieldDefinition[]>(
      `/customization/custom-fields?entityType=${encodeURIComponent(entityType)}`
    );
  },

  async createCustomFieldDefinition(input: CreateCustomFieldDefinition) {
    const parsed = CreateCustomFieldDefinitionSchema.parse(input);
    return apiClient.post<CustomFieldDefinition>(`/customization/custom-fields`, parsed, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async updateCustomFieldDefinition(id: string, patch: UpdateCustomFieldDefinition) {
    return apiClient.put<CustomFieldDefinition>(`/customization/custom-fields/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async deleteCustomFieldDefinition(id: string) {
    return apiClient.delete(`/customization/custom-fields/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  },

  async getCustomFieldLayout(entityType: CustomizableEntityType) {
    const response = await apiClient.get<EntityLayout | null>(
      `/customization/layouts/${entityType}`
    );
    return response ? EntityLayoutSchema.parse(response) : null;
  },

  async saveCustomFieldLayout(entityType: CustomizableEntityType, layout: EntityLayout["layout"]) {
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
