import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateEnrollmentInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses, assertCanEnrollmentManage } from "../../policies/assert-can-classes";
import type { ClassEnrollmentEntity } from "../../domain/entities/classes.entities";
import { assertValidEnrollmentStatusTransition } from "../../domain/rules/enrollment.rules";

type UpdateEnrollmentParams = UpdateEnrollmentInput & { enrollmentId: string };

@RequireTenant()
export class UpdateEnrollmentUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: UpdateEnrollmentParams,
    ctx: UseCaseContext
  ): Promise<ClassEnrollmentEntity> {
    assertCanClasses(ctx, "classes.write");
    assertCanEnrollmentManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findEnrollmentById(tenantId, workspaceId, input.enrollmentId);
    if (!existing) {
      throw new NotFoundError("Enrollment not found", { code: "Classes:EnrollmentNotFound" });
    }

    if (input.status && input.status !== existing.status) {
      assertValidEnrollmentStatusTransition(existing.status, input.status);
    }

    const updated = await this.repo.updateEnrollment(tenantId, workspaceId, input.enrollmentId, {
      payerClientId: input.payerClientId,
      payerPartyId:
        input.payerPartyId === null ? null : input.payerPartyId ? input.payerPartyId : undefined,
      startDate: input.startDate
        ? new Date(input.startDate)
        : input.startDate === null
          ? null
          : undefined,
      endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
      isActive: typeof input.isActive === "boolean" ? input.isActive : undefined,
      priceOverridePerSession:
        input.priceOverridePerSession !== undefined ? input.priceOverridePerSession : undefined,
      status: input.status ?? undefined,
      seatType: input.seatType ?? undefined,
      source: input.source ?? undefined,
      priceCents: input.priceCents !== undefined ? input.priceCents : undefined,
      currency: input.currency === null ? null : input.currency ? input.currency : undefined,
      discountCents: input.discountCents !== undefined ? input.discountCents : undefined,
      discountLabel:
        input.discountLabel === null ? null : input.discountLabel ? input.discountLabel : undefined,
      placementLevel:
        input.placementLevel === null
          ? null
          : input.placementLevel
            ? input.placementLevel
            : undefined,
      placementGoal:
        input.placementGoal === null ? null : input.placementGoal ? input.placementGoal : undefined,
      placementNote:
        input.placementNote === null ? null : input.placementNote ? input.placementNote : undefined,
      updatedAt: this.clock.now(),
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.updated",
      entityType: "ClassEnrollment",
      entityId: updated.id,
      metadata: { isActive: updated.isActive, payerClientId: updated.payerClientId },
    });

    return updated;
  }
}
