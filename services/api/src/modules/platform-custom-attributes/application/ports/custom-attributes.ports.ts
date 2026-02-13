import type {
  CreateDimensionTypeInput,
  CreateDimensionValueInput,
  CustomFieldFilter,
  DimensionFilter,
  DimensionTypeDto,
  DimensionValueDto,
  EntityDimensionAssignment,
  EntityDimensionsDto,
} from "@corely/contracts";

export interface DimensionsReadPort {
  listTypes(tenantId: string, appliesTo?: string): Promise<DimensionTypeDto[]>;
  listValues(tenantId: string, typeId: string): Promise<DimensionValueDto[]>;
  getEntityAssignments(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<EntityDimensionsDto>;
  resolveEntityIdsByDimensionFilters(
    tenantId: string,
    entityType: string,
    filters: DimensionFilter[]
  ): Promise<string[]>;
}

export interface DimensionsWritePort {
  createType(tenantId: string, input: CreateDimensionTypeInput): Promise<DimensionTypeDto>;
  updateType(
    tenantId: string,
    id: string,
    patch: Partial<CreateDimensionTypeInput>
  ): Promise<DimensionTypeDto>;
  deleteType(tenantId: string, id: string): Promise<void>;
  createValue(
    tenantId: string,
    typeId: string,
    input: CreateDimensionValueInput
  ): Promise<DimensionValueDto>;
  updateValue(
    tenantId: string,
    id: string,
    patch: Partial<CreateDimensionValueInput>
  ): Promise<DimensionValueDto>;
  deleteValue(tenantId: string, id: string): Promise<void>;
  setEntityAssignments(
    tenantId: string,
    entityType: string,
    entityId: string,
    assignments: EntityDimensionAssignment[]
  ): Promise<EntityDimensionsDto>;
  deleteEntityAssignments(tenantId: string, entityType: string, entityId: string): Promise<void>;
}

export interface IndexedCustomFieldMetadata {
  fieldId: string;
  key: string;
  label: string;
  type: string;
}

export interface CustomFieldsReadPort {
  getEntityValues(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<Record<string, unknown>>;
  resolveEntityIdsByCustomFieldFilters(
    tenantId: string,
    entityType: string,
    filters: CustomFieldFilter[]
  ): Promise<string[]>;
  listIndexedFields(tenantId: string, entityType: string): Promise<IndexedCustomFieldMetadata[]>;
}

export interface CustomFieldsWritePort {
  setEntityValues(
    tenantId: string,
    entityType: string,
    entityId: string,
    values: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  deleteEntityValues(tenantId: string, entityType: string, entityId: string): Promise<void>;
}

export const DIMENSIONS_READ_PORT = Symbol("DIMENSIONS_READ_PORT");
export const DIMENSIONS_WRITE_PORT = Symbol("DIMENSIONS_WRITE_PORT");
export const CUSTOM_FIELDS_READ_PORT = Symbol("CUSTOM_FIELDS_READ_PORT");
export const CUSTOM_FIELDS_WRITE_PORT = Symbol("CUSTOM_FIELDS_WRITE_PORT");
