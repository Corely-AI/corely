import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortOutcomesManage } from "../../policies/assert-can-classes";
import { CLASSES_MILESTONE_DELETED_EVENT } from "../../domain/events/monthly-invoices-generated.event";

@RequireTenant()
export class DeleteMilestoneUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort
  ) {}

  async execute(input: { milestoneId: string }, ctx: UseCaseContext): Promise<void> {
    assertCanCohortOutcomesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findMilestoneById(tenantId, workspaceId, input.milestoneId);
    if (!existing) {
      throw new NotFoundError("Milestone not found", { code: "Classes:MilestoneNotFound" });
    }

    await this.repo.deleteMilestone(tenantId, workspaceId, input.milestoneId);

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_MILESTONE_DELETED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: existing.classGroupId,
        milestoneId: existing.id,
        at: new Date().toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.milestone.deleted",
      entityType: "ClassMilestone",
      entityId: existing.id,
      metadata: { classGroupId: existing.classGroupId },
    });
  }
}
