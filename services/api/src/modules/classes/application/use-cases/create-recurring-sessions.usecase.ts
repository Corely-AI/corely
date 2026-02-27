import { ForbiddenError, NotFoundError, ValidationFailedError } from "@corely/domain";
import {
  RequireTenant,
  type UseCaseContext,
  parseLocalDate,
  compareLocalDate,
  addDays,
} from "@corely/kernel";
import type { CreateRecurringSessionsInput } from "@corely/contracts";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses, assertCanSessionManage } from "../../policies/assert-can-classes";
import type { ClassSessionEntity } from "../../domain/entities/classes.entities";
import {
  attachBillingStatusToSessions,
  type SessionWithBillingStatus,
} from "../helpers/session-billing-status";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import { getMonthKeyForInstant } from "../helpers/billing-period";
import { monthLockedDetail } from "../helpers/billing-locks";

@RequireTenant()
export class CreateRecurringSessionsUseCase {
  private readonly actionKey = "classes.session.recurring.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateRecurringSessionsInput,
    ctx: UseCaseContext
  ): Promise<SessionWithBillingStatus[]> {
    assertCanClasses(ctx, "classes.write");
    assertCanSessionManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.weekdays?.length) {
      throw new ValidationFailedError("weekdays is required", [
        { message: "weekdays is required", members: ["weekdays"] },
      ]);
    }

    const group = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!group) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        const cachedSessions = this.fromJson(cached.body);
        return attachBillingStatusToSessions(this.repo, tenantId, workspaceId, cachedSessions);
      }
    }

    const tz = input.timezone ?? "Europe/Berlin";
    let current = parseLocalDate(input.startDate);
    const end = parseLocalDate(input.endDate);
    const sessions: ClassSessionEntity[] = [];
    const now = this.clock.now();

    while (compareLocalDate(current, end) <= 0) {
      const weekday = this.getWeekday(current, tz);
      if (input.weekdays.includes(weekday)) {
        const startsAt = fromZonedTime(`${current}T${input.time}:00`, tz);
        const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);

        sessions.push({
          id: this.idGenerator.newId(),
          tenantId,
          workspaceId,
          classGroupId: input.classGroupId,
          startsAt,
          endsAt,
          topic: null,
          notes: null,
          status: "PLANNED",
          type: "LECTURE",
          meetingProvider: null,
          meetingJoinUrl: null,
          meetingExternalId: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      current = addDays(current, 1, tz as any);
    }

    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );

    if (settings.billingBasis === "SCHEDULED_SESSIONS") {
      const monthsToCheck = new Set(
        sessions.map((session) => getMonthKeyForInstant(session.startsAt))
      );
      for (const month of monthsToCheck) {
        const locked = await this.repo.isMonthLocked(tenantId, workspaceId, month);
        if (locked) {
          const detail = monthLockedDetail(settings.billingMonthStrategy);
          throw new ForbiddenError(detail, "Classes:MonthLocked", { publicMessage: detail });
        }
      }
    }

    const created: ClassSessionEntity[] = [];
    for (const session of sessions) {
      const saved = await this.repo.upsertSession(session);
      created.push(saved);
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.session.recurring_created",
      entityType: "ClassGroup",
      entityId: input.classGroupId,
      metadata: { count: created.length },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(created),
      });
    }

    return attachBillingStatusToSessions(this.repo, tenantId, workspaceId, created);
  }

  private getWeekday(localDate: string, tz: string): number {
    const atNoon = fromZonedTime(`${localDate}T12:00:00`, tz);
    const isoDay = Number(formatInTimeZone(atNoon, tz, "i"));
    return isoDay === 7 ? 0 : isoDay;
  }

  private toJson(items: ClassSessionEntity[]) {
    return items.map((session) => ({
      ...session,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt ? session.endsAt.toISOString() : null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));
  }

  private fromJson(body: any): ClassSessionEntity[] {
    if (!Array.isArray(body)) {
      return [];
    }
    return body.map((session) => ({
      ...session,
      startsAt: new Date(session.startsAt),
      endsAt: session.endsAt ? new Date(session.endsAt) : null,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
    })) as ClassSessionEntity[];
  }
}
