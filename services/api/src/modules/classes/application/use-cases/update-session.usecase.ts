import { NotFoundError, ForbiddenError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateClassSessionInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { getMonthKeyForInstant } from "../helpers/billing-period";
import type { ClassSessionEntity } from "../../domain/entities/classes.entities";

type UpdateSessionParams = UpdateClassSessionInput & { sessionId: string };

@RequireTenant()
export class UpdateSessionUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: UpdateSessionParams, ctx: UseCaseContext): Promise<ClassSessionEntity> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findSessionById(tenantId, workspaceId, input.sessionId);
    if (!existing) {
      throw new NotFoundError("Session not found", { code: "Classes:SessionNotFound" });
    }

    const effectiveStart = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const monthKey = getMonthKeyForInstant(effectiveStart);
    const locked = await this.repo.isMonthLocked(tenantId, workspaceId, monthKey);
    if (locked) {
      throw new ForbiddenError("Month is locked for billing adjustments", "Classes:MonthLocked");
    }

    const updated = await this.repo.updateSession(tenantId, workspaceId, input.sessionId, {
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : input.endsAt === null ? null : undefined,
      topic: input.topic ?? undefined,
      notes: input.notes ?? undefined,
      status: input.status ?? undefined,
      updatedAt: this.clock.now(),
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.session.updated",
      entityType: "ClassSession",
      entityId: updated.id,
      metadata: { status: updated.status },
    });

    return updated;
  }
}
