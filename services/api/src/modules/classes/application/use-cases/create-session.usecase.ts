import { ForbiddenError, NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { CreateClassSessionInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassSessionEntity } from "../../domain/entities/classes.entities";
import {
  attachBillingStatusToSession,
  type SessionWithBillingStatus,
} from "../helpers/session-billing-status";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import { getMonthKeyForInstant } from "../helpers/billing-period";
import { monthLockedDetail } from "../helpers/billing-locks";

@RequireTenant()
export class CreateSessionUseCase {
  private readonly actionKey = "classes.session.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateClassSessionInput,
    ctx: UseCaseContext
  ): Promise<SessionWithBillingStatus> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    if (!input.classGroupId) {
      throw new ValidationFailedError("classGroupId is required", [
        { message: "classGroupId is required", members: ["classGroupId"] },
      ]);
    }

    const group = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!group) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );
    if (settings.billingBasis === "SCHEDULED_SESSIONS") {
      const monthKey = getMonthKeyForInstant(new Date(input.startsAt));
      const locked = await this.repo.isMonthLocked(tenantId, workspaceId, monthKey);
      if (locked) {
        const detail = monthLockedDetail(settings.billingMonthStrategy);
        throw new ForbiddenError(detail, "Classes:MonthLocked", { publicMessage: detail });
      }
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        const cachedSession = this.fromJson(cached.body);
        return attachBillingStatusToSession(this.repo, tenantId, workspaceId, cachedSession);
      }
    }

    const now = this.clock.now();
    const session: ClassSessionEntity = {
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      classGroupId: input.classGroupId,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      topic: input.topic ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "PLANNED",
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.repo.upsertSession(session);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.session.created",
      entityType: "ClassSession",
      entityId: created.id,
      metadata: { classGroupId: created.classGroupId },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(created),
      });
    }

    return attachBillingStatusToSession(this.repo, tenantId, workspaceId, created);
  }

  private toJson(session: ClassSessionEntity) {
    return {
      ...session,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt ? session.endsAt.toISOString() : null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private fromJson(body: any): ClassSessionEntity {
    return {
      ...body,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    } as ClassSessionEntity;
  }
}
