import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortResourcesManage } from "../../policies/assert-can-classes";

@RequireTenant()
export class ReorderResourcesUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort
  ) {}

  async execute(
    input: { classGroupId: string; orderedIds: string[] },
    ctx: UseCaseContext
  ): Promise<void> {
    assertCanCohortResourcesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    await this.repo.reorderResources(tenantId, workspaceId, input.classGroupId, input.orderedIds);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.resource.reordered",
      entityType: "ClassGroup",
      entityId: input.classGroupId,
      metadata: { orderedIds: input.orderedIds },
    });
  }
}
