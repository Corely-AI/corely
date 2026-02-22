import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { CreateMilestoneInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortOutcomesManage } from "../../policies/assert-can-classes";
import { CLASSES_MILESTONE_CREATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassMilestoneEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class CreateMilestoneUseCase {
  private readonly actionKey = "classes.milestone.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateMilestoneInput & { classGroupId: string },
    ctx: UseCaseContext
  ): Promise<ClassMilestoneEntity> {
    assertCanCohortOutcomesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const classGroup = await this.repo.findClassGroupById(
      tenantId,
      workspaceId,
      input.classGroupId
    );
    if (!classGroup) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const now = this.clock.now();
    const milestone = await this.repo.createMilestone({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      classGroupId: input.classGroupId,
      programMilestoneTemplateId: input.programMilestoneTemplateId ?? null,
      title: input.title,
      type: input.type,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      required: input.required,
      index: input.index ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_MILESTONE_CREATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        milestoneId: milestone.id,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.milestone.created",
      entityType: "ClassMilestone",
      entityId: milestone.id,
      metadata: { classGroupId: input.classGroupId, type: milestone.type },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(milestone),
      });
    }

    return milestone;
  }

  private toJson(entity: ClassMilestoneEntity) {
    return {
      ...entity,
      dueAt: entity.dueAt ? entity.dueAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassMilestoneEntity {
    return {
      ...body,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassMilestoneEntity;
  }
}
