import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateDimensionTypeInput,
  CreateDimensionValueInput,
  DimensionFilter,
  UpdateDimensionTypeInput,
  UpdateDimensionValueInput,
  EntityDimensionAssignment,
} from "@corely/contracts";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { AUDIT_PORT_TOKEN } from "../../../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../../../shared/ports/idempotency-storage.port";
import {
  DIMENSIONS_READ_PORT,
  DIMENSIONS_WRITE_PORT,
  type DimensionsReadPort,
  type DimensionsWritePort,
} from "../ports/custom-attributes.ports";

@Injectable()
export class CreateDimensionTypeUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly idempotency: IdempotencyStoragePort
  ) {}

  async execute(
    tenantId: string,
    actorUserId: string,
    input: CreateDimensionTypeInput,
    idempotencyKey?: string
  ) {
    const actionKey = `platform-custom-attributes:create-dimension-type:${input.code}`;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        return cached.body;
      }
    }

    const created = await this.dimensions.createType(tenantId, input);
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.type.created",
      entityType: "DimensionType",
      entityId: created.id,
      metadata: {
        code: created.code,
      },
    });

    if (idempotencyKey) {
      await this.idempotency.store(actionKey, tenantId, idempotencyKey, { body: created });
    }

    return created;
  }
}

@Injectable()
export class UpdateDimensionTypeUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
  ) {}

  async execute(
    tenantId: string,
    actorUserId: string,
    id: string,
    patch: UpdateDimensionTypeInput
  ) {
    const updated = await this.dimensions.updateType(tenantId, id, patch);
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.type.updated",
      entityType: "DimensionType",
      entityId: id,
      metadata: { patch },
    });
    return updated;
  }
}

@Injectable()
export class DeleteDimensionTypeUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
  ) {}

  async execute(tenantId: string, actorUserId: string, id: string) {
    await this.dimensions.deleteType(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.type.deleted",
      entityType: "DimensionType",
      entityId: id,
      metadata: {},
    });
  }
}

@Injectable()
export class CreateDimensionValueUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly idempotency: IdempotencyStoragePort
  ) {}

  async execute(
    tenantId: string,
    actorUserId: string,
    typeId: string,
    input: CreateDimensionValueInput,
    idempotencyKey?: string
  ) {
    const actionKey = `platform-custom-attributes:create-dimension-value:${typeId}:${input.code}`;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        return cached.body;
      }
    }

    const created = await this.dimensions.createValue(tenantId, typeId, input);
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.value.created",
      entityType: "DimensionValue",
      entityId: created.id,
      metadata: {
        typeId,
      },
    });

    if (idempotencyKey) {
      await this.idempotency.store(actionKey, tenantId, idempotencyKey, { body: created });
    }

    return created;
  }
}

@Injectable()
export class UpdateDimensionValueUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
  ) {}

  async execute(
    tenantId: string,
    actorUserId: string,
    id: string,
    patch: UpdateDimensionValueInput
  ) {
    const updated = await this.dimensions.updateValue(tenantId, id, patch);
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.value.updated",
      entityType: "DimensionValue",
      entityId: id,
      metadata: { patch },
    });
    return updated;
  }
}

@Injectable()
export class DeleteDimensionValueUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
  ) {}

  async execute(tenantId: string, actorUserId: string, id: string) {
    await this.dimensions.deleteValue(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.value.deleted",
      entityType: "DimensionValue",
      entityId: id,
      metadata: {},
    });
  }
}

@Injectable()
export class SetEntityDimensionsUseCase {
  constructor(
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensions: DimensionsWritePort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
  ) {}

  async execute(
    tenantId: string,
    actorUserId: string,
    entityType: string,
    entityId: string,
    assignments: EntityDimensionAssignment[]
  ) {
    const saved = await this.dimensions.setEntityAssignments(
      tenantId,
      entityType,
      entityId,
      assignments
    );
    await this.audit.log({
      tenantId,
      userId: actorUserId || "system",
      action: "dimension.assignments.set",
      entityType: "EntityDimension",
      entityId: `${entityType}:${entityId}`,
      metadata: { assignments },
    });
    return saved;
  }
}

@Injectable()
export class GetEntityDimensionsUseCase {
  constructor(@Inject(DIMENSIONS_READ_PORT) private readonly dimensions: DimensionsReadPort) {}

  async execute(tenantId: string, entityType: string, entityId: string) {
    return this.dimensions.getEntityAssignments(tenantId, entityType, entityId);
  }
}

@Injectable()
export class ResolveEntityIdsByDimensionFiltersUseCase {
  constructor(@Inject(DIMENSIONS_READ_PORT) private readonly dimensions: DimensionsReadPort) {}

  async execute(tenantId: string, entityType: string, filters: DimensionFilter[]) {
    return this.dimensions.resolveEntityIdsByDimensionFilters(tenantId, entityType, filters);
  }
}
