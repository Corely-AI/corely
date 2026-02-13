import { Inject, Injectable } from "@nestjs/common";
import type { CustomFieldFilter } from "@corely/contracts";
import {
  CUSTOM_FIELDS_READ_PORT,
  CUSTOM_FIELDS_WRITE_PORT,
  type CustomFieldsReadPort,
  type CustomFieldsWritePort,
} from "../ports/custom-attributes.ports";

@Injectable()
export class GetEntityCustomFieldValuesUseCase {
  constructor(@Inject(CUSTOM_FIELDS_READ_PORT) private readonly fields: CustomFieldsReadPort) {}

  async execute(tenantId: string, entityType: string, entityId: string) {
    return this.fields.getEntityValues(tenantId, entityType, entityId);
  }
}

@Injectable()
export class SetEntityCustomFieldValuesUseCase {
  constructor(@Inject(CUSTOM_FIELDS_WRITE_PORT) private readonly fields: CustomFieldsWritePort) {}

  async execute(
    tenantId: string,
    entityType: string,
    entityId: string,
    values: Record<string, unknown>
  ) {
    return this.fields.setEntityValues(tenantId, entityType, entityId, values);
  }
}

@Injectable()
export class DeleteEntityCustomFieldValuesUseCase {
  constructor(@Inject(CUSTOM_FIELDS_WRITE_PORT) private readonly fields: CustomFieldsWritePort) {}

  async execute(tenantId: string, entityType: string, entityId: string) {
    await this.fields.deleteEntityValues(tenantId, entityType, entityId);
  }
}

@Injectable()
export class ResolveEntityIdsByCustomFieldFiltersUseCase {
  constructor(@Inject(CUSTOM_FIELDS_READ_PORT) private readonly fields: CustomFieldsReadPort) {}

  async execute(tenantId: string, entityType: string, filters: CustomFieldFilter[]) {
    return this.fields.resolveEntityIdsByCustomFieldFilters(tenantId, entityType, filters);
  }
}

@Injectable()
export class ListIndexedCustomFieldsUseCase {
  constructor(@Inject(CUSTOM_FIELDS_READ_PORT) private readonly fields: CustomFieldsReadPort) {}

  async execute(tenantId: string, entityType: string) {
    return this.fields.listIndexedFields(tenantId, entityType);
  }
}
