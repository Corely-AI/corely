import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassAttendanceEntity } from "../../domain/entities/classes.entities";
import { getMonthKeyForInstant } from "../helpers/billing-period";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";

@RequireTenant()
export class GetSessionAttendanceUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly settingsRepo: ClassesSettingsRepositoryPort
  ) {}

  async execute(
    input: { sessionId: string },
    ctx: UseCaseContext
  ): Promise<{ items: ClassAttendanceEntity[]; locked: boolean }> {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const session = await this.repo.findSessionById(tenantId, workspaceId, input.sessionId);
    if (!session) {
      throw new NotFoundError("Session not found", { code: "Classes:SessionNotFound" });
    }

    const items = await this.repo.listAttendanceBySession(tenantId, workspaceId, input.sessionId);
    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );
    const monthKey = getMonthKeyForInstant(session.startsAt);
    const locked =
      settings.billingBasis === "ATTENDED_SESSIONS"
        ? await this.repo.isMonthLocked(tenantId, workspaceId, monthKey)
        : false;
    return { items, locked };
  }
}
