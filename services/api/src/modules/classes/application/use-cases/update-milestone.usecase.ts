import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { UpdateMilestoneInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortOutcomesManage } from "../../policies/assert-can-classes";
import { CLASSES_MILESTONE_UPDATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassMilestoneEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpdateMilestoneUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: UpdateMilestoneInput & { milestoneId: string },
    ctx: UseCaseContext
  ): Promise<ClassMilestoneEntity> {
    assertCanCohortOutcomesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findMilestoneById(tenantId, workspaceId, input.milestoneId);
    if (!existing) {
      throw new NotFoundError("Milestone not found", { code: "Classes:MilestoneNotFound" });
    }

    const updated = await this.repo.updateMilestone(tenantId, workspaceId, input.milestoneId, {
      title: input.title ?? undefined,
      type: input.type ?? undefined,
      dueAt: input.dueAt ? new Date(input.dueAt) : input.dueAt === null ? null : undefined,
      required: input.required,
      index: input.index !== undefined ? input.index : undefined,
      updatedAt: this.clock.now(),
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_MILESTONE_UPDATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: updated.classGroupId,
        milestoneId: updated.id,
        at: this.clock.now().toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.milestone.updated",
      entityType: "ClassMilestone",
      entityId: updated.id,
      metadata: { classGroupId: updated.classGroupId },
    });

    return updated;
  }
}
