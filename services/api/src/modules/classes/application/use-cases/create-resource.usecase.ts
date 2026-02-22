import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { CreateClassGroupResourceInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortResourcesManage } from "../../policies/assert-can-classes";
import { validateResourcePayload } from "../../domain/rules/resource.rules";
import { CLASSES_RESOURCE_CREATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassGroupResourceEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class CreateResourceUseCase {
  private readonly actionKey = "classes.resource.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateClassGroupResourceInput & { classGroupId: string },
    ctx: UseCaseContext
  ): Promise<ClassGroupResourceEntity> {
    assertCanCohortResourcesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const classGroup = await this.repo.findClassGroupById(
      tenantId,
      workspaceId,
      input.classGroupId
    );
    if (!classGroup) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    validateResourcePayload({
      type: input.type,
      documentId: input.documentId,
      url: input.url,
    });

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const now = this.clock.now();
    const resource = await this.repo.createResource({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      classGroupId: input.classGroupId,
      type: input.type,
      title: input.title,
      documentId: input.documentId ?? null,
      url: input.url ?? null,
      visibility: input.visibility ?? "ENROLLED_ONLY",
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_RESOURCE_CREATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        resourceId: resource.id,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.resource.created",
      entityType: "ClassGroupResource",
      entityId: resource.id,
      metadata: { classGroupId: input.classGroupId, type: resource.type },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(resource),
      });
    }

    return resource;
  }

  private toJson(entity: ClassGroupResourceEntity) {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassGroupResourceEntity {
    return {
      ...body,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassGroupResourceEntity;
  }
}
