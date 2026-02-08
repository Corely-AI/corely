import { NotFoundError, ForbiddenError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateClassSessionInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { getMonthKeyForInstant } from "../helpers/billing-period";
import type {
  ClassSessionEntity,
  ClassAttendanceEntity,
} from "../../domain/entities/classes.entities";
import {
  attachBillingStatusToSession,
  type SessionWithBillingStatus,
} from "../helpers/session-billing-status";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import {
  isDoneStatus,
  isScheduledStatusIncluded,
  monthLockedDetail,
} from "../helpers/billing-locks";

type UpdateSessionParams = UpdateClassSessionInput & { sessionId: string };

@RequireTenant()
export class UpdateSessionUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(
    input: UpdateSessionParams,
    ctx: UseCaseContext
  ): Promise<SessionWithBillingStatus> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findSessionById(tenantId, workspaceId, input.sessionId);
    if (!existing) {
      throw new NotFoundError("Session not found", { code: "Classes:SessionNotFound" });
    }

    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );

    const nextStartsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const existingMonth = getMonthKeyForInstant(existing.startsAt);
    const nextMonth = getMonthKeyForInstant(nextStartsAt);
    const statusChanged = typeof input.status !== "undefined" && input.status !== existing.status;
    const monthChanged = Boolean(input.startsAt) && nextMonth !== existingMonth;

    const nextStatus = input.status ?? existing.status;
    const statusImpacting =
      settings.billingBasis === "SCHEDULED_SESSIONS"
        ? statusChanged &&
          isScheduledStatusIncluded(existing.status) !== isScheduledStatusIncluded(nextStatus)
        : statusChanged && isDoneStatus(existing.status) !== isDoneStatus(nextStatus);

    const billingImpactingChange = statusImpacting || monthChanged;

    if (billingImpactingChange) {
      const monthsToCheck = new Set([existingMonth, nextMonth]);
      for (const month of monthsToCheck) {
        const locked = await this.repo.isMonthLocked(tenantId, workspaceId, month);
        if (locked) {
          throw new ForbiddenError(
            monthLockedDetail(settings.billingMonthStrategy),
            "Classes:MonthLocked"
          );
        }
      }
    }

    const updated = await this.repo.updateSession(tenantId, workspaceId, input.sessionId, {
      startsAt: input.startsAt ? nextStartsAt : undefined,
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

    // Auto-fill attendance logic
    if (
      statusChanged &&
      isDoneStatus(nextStatus) &&
      !isDoneStatus(existing.status) &&
      settings.attendanceMode === "AUTO_FULL"
    ) {
      await this.autoFillAttendance(tenantId, workspaceId, updated, ctx.userId ?? "system");
    }

    return attachBillingStatusToSession(this.repo, tenantId, workspaceId, updated);
  }

  private async autoFillAttendance(
    tenantId: string,
    workspaceId: string,
    session: ClassSessionEntity,
    userId: string
  ) {
    // 1. Get active enrollments
    const { items: enrollments } = await this.repo.listEnrollments(
      tenantId,
      workspaceId,
      {
        classGroupId: session.classGroupId,
        isActive: true,
      },
      { page: 1, pageSize: 1000 }
    );

    // 2. Filter by date validity
    const sessionDate = session.startsAt;
    const validEnrollments = enrollments.filter((e) => {
      if (e.startDate && e.startDate > sessionDate) {
        return false;
      }
      if (e.endDate && e.endDate < sessionDate) {
        return false;
      }
      return true;
    });

    if (validEnrollments.length === 0) {
      return;
    }

    // 3. Get existing attendance to avoid overwrite
    const existingAttendance = await this.repo.listAttendanceBySession(
      tenantId,
      workspaceId,
      session.id
    );
    const existingEnrollmentIds = new Set(existingAttendance.map((a) => a.enrollmentId));

    // 4. Create new attendance entities
    const newAttendance: ClassAttendanceEntity[] = [];
    const now = this.clock.now();

    for (const enrollment of validEnrollments) {
      if (existingEnrollmentIds.has(enrollment.id)) {
        continue;
      }

      newAttendance.push({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        sessionId: session.id,
        enrollmentId: enrollment.id,
        status: "PRESENT",
        billable: true,
        note: "Auto-filled",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (newAttendance.length > 0) {
      await this.repo.bulkUpsertAttendance(tenantId, workspaceId, session.id, newAttendance);

      await this.audit.log({
        tenantId,
        userId,
        action: "classes.attendance.autofilled",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { count: newAttendance.length },
      });
    }
  }
}
