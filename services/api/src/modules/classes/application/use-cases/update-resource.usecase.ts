import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import type { UpdateClassGroupResourceInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortResourcesManage } from "../../policies/assert-can-classes";
import { validateResourcePayload } from "../../domain/rules/resource.rules";
import { CLASSES_RESOURCE_UPDATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassGroupResourceEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpdateResourceUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: UpdateClassGroupResourceInput & { resourceId: string },
    ctx: UseCaseContext
  ): Promise<ClassGroupResourceEntity> {
    assertCanCohortResourcesManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findResourceById(tenantId, workspaceId, input.resourceId);
    if (!existing) {
      throw new NotFoundError("Resource not found", { code: "Classes:ResourceNotFound" });
    }

    validateResourcePayload({
      type: input.type ?? existing.type,
      documentId: input.documentId !== undefined ? input.documentId : existing.documentId,
      url: input.url !== undefined ? input.url : existing.url,
    });

    const updated = await this.repo.updateResource(tenantId, workspaceId, input.resourceId, {
      type: input.type ?? undefined,
      title: input.title ?? undefined,
      documentId: input.documentId ?? undefined,
      url: input.url ?? undefined,
      visibility: input.visibility ?? undefined,
      sortOrder: input.sortOrder ?? undefined,
      updatedAt: this.clock.now(),
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_RESOURCE_UPDATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: updated.classGroupId,
        resourceId: updated.id,
        at: this.clock.now().toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.resource.updated",
      entityType: "ClassGroupResource",
      entityId: updated.id,
      metadata: { classGroupId: updated.classGroupId, type: updated.type },
    });

    return updated;
  }
}
