import { Inject, Injectable } from "@nestjs/common";
import type { CreateTenantInput, CreateTenantResponse } from "@corely/contracts";
import { ValidationFailedError } from "@corely/domain";
import { OUTBOX_PORT, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import { Tenant } from "../../domain/entities/tenant.entity";
import { TenantCreatedEvent } from "../../domain/events/identity.events";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import { AUDIT_PORT_TOKEN, type AuditPort } from "../ports/audit.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "../../../../shared/ports/idempotency-storage.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../shared/ports/clock.port";
import {
  assertPlatformPermission,
  PLATFORM_PERMISSION_KEYS,
} from "../policies/platform-permissions.policy";

export type CreateTenantCommand = CreateTenantInput;

const CREATE_TENANT_ACTION = "identity.create_tenant";
const TENANT_NOTES_MODULE = "identity.tenants";

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotency: IdempotencyStoragePort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(EXT_KV_PORT) private readonly extKv: ExtKvPort
  ) {}

  async execute(input: CreateTenantCommand, ctx: UseCaseContext): Promise<CreateTenantResponse> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.write, {
      grantRepo: this.grantRepo,
    });

    const idempotencyKey = input.idempotencyKey;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(CREATE_TENANT_ACTION, null, idempotencyKey);
      if (cached) {
        return cached.body as CreateTenantResponse;
      }
    }

    const errors = this.validate(input);
    if (errors.length > 0) {
      throw new ValidationFailedError("Validation failed", errors);
    }

    const tenantId = this.idGenerator.newId();
    const createdAt = this.clock.now();
    const tenant = Tenant.create(
      tenantId,
      input.name,
      input.slug,
      input.status ?? "ACTIVE",
      createdAt
    );

    const existing = await this.tenantRepo.findBySlug(tenant.getSlug());
    if (existing) {
      throw new ValidationFailedError("Validation failed", [
        { message: "Slug is already in use", members: ["slug"] },
      ]);
    }

    await this.tenantRepo.create(tenant);

    const notes = input.notes?.trim();
    if (notes) {
      await this.extKv.set({
        tenantId: tenant.getId(),
        moduleId: TENANT_NOTES_MODULE,
        scope: "tenant",
        key: "notes",
        value: notes,
      });
    }

    const tenantCreatedEvent = new TenantCreatedEvent(
      tenant.getId(),
      tenant.getName(),
      tenant.getSlug()
    );
    await this.outbox.enqueue({
      tenantId: tenant.getId(),
      eventType: tenantCreatedEvent.eventType,
      payload: tenantCreatedEvent,
    });

    await this.audit.write({
      tenantId: tenant.getId(),
      actorUserId: ctx.userId ?? null,
      action: "TenantCreated",
      targetType: "Tenant",
      targetId: tenant.getId(),
      metadataJson: JSON.stringify({
        name: tenant.getName(),
        slug: tenant.getSlug(),
        status: tenant.getStatus(),
        notes: notes ?? null,
      }),
      context: {
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      },
    });

    const response: CreateTenantResponse = {
      tenant: {
        id: tenant.getId(),
        name: tenant.getName(),
        slug: tenant.getSlug(),
      },
    };

    if (idempotencyKey) {
      await this.idempotency.store(CREATE_TENANT_ACTION, null, idempotencyKey, {
        statusCode: 201,
        body: response,
      });
    }

    return response;
  }

  private validate(input: CreateTenantInput) {
    const errors: Array<{ message: string; members: string[] }> = [];

    if (!input.name || !input.name.trim()) {
      errors.push({ message: "Tenant name is required", members: ["name"] });
    }

    if (!input.slug || !input.slug.trim()) {
      errors.push({ message: "Slug is required", members: ["slug"] });
    } else if (!/^[a-z0-9-]+$/i.test(input.slug.trim())) {
      errors.push({
        message: "Slug can only contain letters, numbers, and hyphens",
        members: ["slug"],
      });
    }

    if (input.status && !["ACTIVE", "SUSPENDED", "ARCHIVED"].includes(input.status)) {
      errors.push({ message: "Invalid status", members: ["status"] });
    }

    if (input.notes && input.notes.length > 2000) {
      errors.push({ message: "Notes must be 2000 characters or less", members: ["notes"] });
    }

    return errors;
  }
}
