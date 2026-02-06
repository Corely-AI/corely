import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import {
  attachBillingStatusToSession,
  type SessionWithBillingStatus,
} from "../helpers/session-billing-status";

@RequireTenant()
export class GetSessionUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(
    input: { sessionId: string },
    ctx: UseCaseContext
  ): Promise<SessionWithBillingStatus> {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const session = await this.repo.findSessionById(tenantId, workspaceId, input.sessionId);
    if (!session) {
      throw new NotFoundError("Session not found", { code: "Classes:SessionNotFound" });
    }
    return attachBillingStatusToSession(this.repo, tenantId, workspaceId, session);
  }
}
