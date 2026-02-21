import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import {
  CLASSES_COHORT_ENDED_EVENT,
  CLASSES_COHORT_PUBLISHED_EVENT,
  CLASSES_COHORT_STARTED_EVENT,
} from "../../domain/events/monthly-invoices-generated.event";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortManage } from "../../policies/assert-can-classes";
import type { ClassGroupEntity, ClassGroupLifecycle } from "../../domain/entities/classes.entities";
import { assertValidLifecycleTransition } from "../../domain/rules/cohort.rules";

@RequireTenant()
export class UpdateCohortLifecycleUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: { classGroupId: string; lifecycle: ClassGroupLifecycle },
    ctx: UseCaseContext
  ): Promise<ClassGroupEntity> {
    assertCanCohortManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!existing) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    assertValidLifecycleTransition(existing.lifecycle, input.lifecycle);

    const updated = await this.repo.updateClassGroup(tenantId, workspaceId, input.classGroupId, {
      lifecycle: input.lifecycle,
      updatedAt: this.clock.now(),
    });

    const eventTypeByLifecycle: Partial<Record<ClassGroupLifecycle, string>> = {
      PUBLISHED: CLASSES_COHORT_PUBLISHED_EVENT,
      RUNNING: CLASSES_COHORT_STARTED_EVENT,
      ENDED: CLASSES_COHORT_ENDED_EVENT,
    };

    const eventType = eventTypeByLifecycle[input.lifecycle];
    if (eventType) {
      await this.outbox.enqueue({
        tenantId,
        eventType,
        payload: {
          tenantId,
          workspaceId,
          classGroupId: updated.id,
          fromLifecycle: existing.lifecycle,
          toLifecycle: updated.lifecycle,
          at: this.clock.now().toISOString(),
        },
      });
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.cohort.lifecycle.updated",
      entityType: "ClassGroup",
      entityId: updated.id,
      metadata: { from: existing.lifecycle, to: updated.lifecycle },
    });

    return updated;
  }
}
