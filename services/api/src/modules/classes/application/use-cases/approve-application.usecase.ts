import { NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { ApproveApplicationInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanEnrollmentManage } from "../../policies/assert-can-classes";
import { assertValidEnrollmentStatusTransition } from "../../domain/rules/enrollment.rules";
import { CLASSES_ENROLLMENT_APPROVED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassEnrollmentEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class ApproveApplicationUseCase {
  private readonly actionKey = "classes.enrollment.application.approve";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: ApproveApplicationInput & { enrollmentId: string },
    ctx: UseCaseContext
  ): Promise<ClassEnrollmentEntity> {
    assertCanEnrollmentManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const existing = await this.repo.findEnrollmentById(tenantId, workspaceId, input.enrollmentId);
    if (!existing) {
      throw new NotFoundError("Enrollment not found", { code: "Classes:EnrollmentNotFound" });
    }

    if (existing.status !== "APPLIED") {
      throw new ValidationFailedError("Only APPLIED enrollment can be approved", [
        {
          message: "Enrollment must be APPLIED",
          members: ["enrollmentId"],
        },
      ]);
    }

    assertValidEnrollmentStatusTransition(existing.status, "ENROLLED");

    const now = this.clock.now();
    const enrollment = await this.repo.updateEnrollment(tenantId, workspaceId, existing.id, {
      status: "ENROLLED",
      payerClientId: input.payerClientId ?? existing.payerClientId,
      payerPartyId: input.payerPartyId ?? undefined,
      placementLevel: input.placementLevel ?? undefined,
      placementGoal: input.placementGoal ?? undefined,
      placementNote: input.placementNote ?? undefined,
      seatType: input.seatType ?? undefined,
      priceCents: input.priceCents !== undefined ? input.priceCents : undefined,
      currency: input.currency !== undefined ? input.currency : undefined,
      discountCents: input.discountCents !== undefined ? input.discountCents : undefined,
      discountLabel: input.discountLabel ?? undefined,
      updatedAt: now,
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_ENROLLMENT_APPROVED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: enrollment.classGroupId,
        enrollmentId: enrollment.id,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.application.approved",
      entityType: "ClassEnrollment",
      entityId: enrollment.id,
      metadata: {
        classGroupId: enrollment.classGroupId,
        status: enrollment.status,
      },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(enrollment),
      });
    }

    return enrollment;
  }

  private toJson(entity: ClassEnrollmentEntity) {
    return {
      ...entity,
      startDate: entity.startDate ? entity.startDate.toISOString().slice(0, 10) : null,
      endDate: entity.endDate ? entity.endDate.toISOString().slice(0, 10) : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassEnrollmentEntity {
    return {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassEnrollmentEntity;
  }
}
