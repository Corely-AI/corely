import { ForbiddenError, NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { GenerateClassGroupSessionsInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassSessionEntity } from "../../domain/entities/classes.entities";
import {
  attachBillingStatusToSessions,
  type SessionWithBillingStatus,
} from "../helpers/session-billing-status";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import {
  BILLING_TIMEZONE,
  getMonthKeyForInstant,
  getMonthRangeUtc,
  normalizeBillingMonth,
} from "../helpers/billing-period";
import { monthLockedDetail } from "../helpers/billing-locks";
import { generateScheduledSessionStartsForMonth } from "../helpers/schedule-generator";

type GenerateScheduledSessionsCommand = GenerateClassGroupSessionsInput & {
  classGroupId: string;
};

@RequireTenant()
export class GenerateScheduledSessionsUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: GenerateScheduledSessionsCommand,
    ctx: UseCaseContext
  ): Promise<SessionWithBillingStatus[]> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const group = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!group) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }
    if (!group.schedulePattern) {
      throw new ValidationFailedError("Recurring schedule is not configured for this class group", [
        { message: "Recurring schedule is not configured", members: ["schedulePattern"] },
      ]);
    }

    const month = input.month
      ? normalizeBillingMonth(input.month)
      : getMonthKeyForInstant(this.clock.now(), BILLING_TIMEZONE);

    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );
    if (settings.billingBasis === "SCHEDULED_SESSIONS") {
      const locked = await this.repo.isMonthLocked(tenantId, workspaceId, month);
      if (locked) {
        const detail = monthLockedDetail(settings.billingMonthStrategy);
        throw new ForbiddenError(detail, "Classes:MonthLocked", { publicMessage: detail });
      }
    }

    const startsAtList = generateScheduledSessionStartsForMonth({
      schedulePattern: group.schedulePattern ?? null,
      month,
      timezone: BILLING_TIMEZONE,
    });

    if (startsAtList.length === 0) {
      return [];
    }

    const { startUtc, endUtc } = getMonthRangeUtc(month, BILLING_TIMEZONE);
    const existing = await this.listSessionsForMonth(
      tenantId,
      workspaceId,
      input.classGroupId,
      startUtc,
      endUtc
    );
    const existingStarts = new Set(existing.map((session) => session.startsAt.getTime()));

    const now = this.clock.now();
    const created: ClassSessionEntity[] = [];
    for (const startsAt of startsAtList) {
      const startKey = startsAt.getTime();
      if (existingStarts.has(startKey)) {
        continue;
      }
      const session: ClassSessionEntity = {
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        startsAt,
        endsAt: null,
        topic: null,
        notes: null,
        status: "PLANNED",
        createdAt: now,
        updatedAt: now,
      };
      const saved = await this.repo.createSession(session);
      created.push(saved);
      existingStarts.add(startKey);
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.session.scheduled_generated",
      entityType: "ClassGroup",
      entityId: input.classGroupId,
      metadata: { month, count: created.length },
    });

    if (created.length === 0) {
      return [];
    }

    return attachBillingStatusToSessions(this.repo, tenantId, workspaceId, created);
  }

  private async listSessionsForMonth(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    startUtc: Date,
    endUtc: Date
  ): Promise<ClassSessionEntity[]> {
    const pageSize = 200;
    let page = 1;
    const items: ClassSessionEntity[] = [];

    while (true) {
      const result = await this.repo.listSessions(
        tenantId,
        workspaceId,
        { classGroupId, dateFrom: startUtc, dateTo: endUtc },
        { page, pageSize }
      );
      items.push(...result.items);
      if (items.length >= result.total || result.items.length === 0) {
        break;
      }
      page += 1;
    }

    return items;
  }
}
