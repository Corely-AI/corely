import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassAttendanceEntity } from "../../domain/entities/classes.entities";
import { getMonthKeyForInstant } from "../helpers/billing-period";

@RequireTenant()
export class GetSessionAttendanceUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

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
    const monthKey = getMonthKeyForInstant(session.startsAt);
    const locked = await this.repo.isMonthLocked(tenantId, workspaceId, monthKey);
    return { items, locked };
  }
}
