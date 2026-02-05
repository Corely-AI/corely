import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateEnrollmentInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassEnrollmentEntity } from "../../domain/entities/classes.entities";

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
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findEnrollmentById(tenantId, workspaceId, input.enrollmentId);
    if (!existing) {
      throw new NotFoundError("Enrollment not found", { code: "Classes:EnrollmentNotFound" });
    }

    const updated = await this.repo.updateEnrollment(tenantId, workspaceId, input.enrollmentId, {
      startDate: input.startDate
        ? new Date(input.startDate)
        : input.startDate === null
          ? null
          : undefined,
      endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
      isActive: typeof input.isActive === "boolean" ? input.isActive : undefined,
      priceOverridePerSession:
        input.priceOverridePerSession !== undefined ? input.priceOverridePerSession : undefined,
      updatedAt: this.clock.now(),
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.enrollment.updated",
      entityType: "ClassEnrollment",
      entityId: updated.id,
      metadata: { isActive: updated.isActive },
    });

    return updated;
  }
}
