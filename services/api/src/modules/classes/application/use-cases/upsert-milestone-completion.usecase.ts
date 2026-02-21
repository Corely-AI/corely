import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { UpsertMilestoneCompletionInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortOutcomesManage } from "../../policies/assert-can-classes";
import { CLASSES_MILESTONE_COMPLETION_UPDATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassMilestoneCompletionEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpsertMilestoneCompletionUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: UpsertMilestoneCompletionInput & { milestoneId: string; enrollmentId: string },
    ctx: UseCaseContext
  ): Promise<ClassMilestoneCompletionEntity> {
    assertCanCohortOutcomesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const [milestone, enrollment] = await Promise.all([
      this.repo.findMilestoneById(tenantId, workspaceId, input.milestoneId),
      this.repo.findEnrollmentById(tenantId, workspaceId, input.enrollmentId),
    ]);

    if (!milestone) {
      throw new NotFoundError("Milestone not found", { code: "Classes:MilestoneNotFound" });
    }
    if (!enrollment) {
      throw new NotFoundError("Enrollment not found", { code: "Classes:EnrollmentNotFound" });
    }

    const now = this.clock.now();
    const completion = await this.repo.upsertMilestoneCompletion(
      tenantId,
      workspaceId,
      input.milestoneId,
      input.enrollmentId,
      {
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        milestoneId: input.milestoneId,
        enrollmentId: input.enrollmentId,
        status: input.status,
        score: input.score ?? null,
        feedback: input.feedback ?? null,
        gradedByPartyId: input.gradedByPartyId ?? null,
        gradedAt: input.gradedAt ? new Date(input.gradedAt) : null,
        createdAt: now,
        updatedAt: now,
      }
    );

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_MILESTONE_COMPLETION_UPDATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: enrollment.classGroupId,
        milestoneId: milestone.id,
        enrollmentId: enrollment.id,
        status: completion.status,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.milestone.completion.upserted",
      entityType: "ClassMilestoneCompletion",
      entityId: completion.id,
      metadata: {
        classGroupId: enrollment.classGroupId,
        milestoneId: milestone.id,
        status: completion.status,
      },
    });

    return completion;
  }
}
