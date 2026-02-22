import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortResourcesManage } from "../../policies/assert-can-classes";
import { CLASSES_RESOURCE_DELETED_EVENT } from "../../domain/events/monthly-invoices-generated.event";

@RequireTenant()
export class DeleteResourceUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort
  ) {}

  async execute(input: { resourceId: string }, ctx: UseCaseContext): Promise<void> {
    assertCanCohortResourcesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findResourceById(tenantId, workspaceId, input.resourceId);
    if (!existing) {
      throw new NotFoundError("Resource not found", { code: "Classes:ResourceNotFound" });
    }

    await this.repo.deleteResource(tenantId, workspaceId, input.resourceId);

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_RESOURCE_DELETED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: existing.classGroupId,
        resourceId: existing.id,
        at: new Date().toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.resource.deleted",
      entityType: "ClassGroupResource",
      entityId: existing.id,
      metadata: { classGroupId: existing.classGroupId, type: existing.type },
    });
  }
}
