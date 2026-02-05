import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateClassGroupInput } from "@corely/contracts";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassGroupEntity } from "../../domain/entities/classes.entities";

type UpdateClassGroupParams = UpdateClassGroupInput & { classGroupId: string };

@RequireTenant()
export class UpdateClassGroupUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: UpdateClassGroupParams, ctx: UseCaseContext): Promise<ClassGroupEntity> {
    assertCanClasses(ctx, "classes.write");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!existing) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    const updated = await this.repo.updateClassGroup(tenantId, workspaceId, input.classGroupId, {
      name: input.name ?? undefined,
      subject: input.subject ?? undefined,
      level: input.level ?? undefined,
      defaultPricePerSession: input.defaultPricePerSession ?? undefined,
      currency: input.currency ?? undefined,
      schedulePattern: input.schedulePattern ?? undefined,
      status: input.status ?? undefined,
      updatedAt: this.clock.now(),
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.class-group.updated",
      entityType: "ClassGroup",
      entityId: updated.id,
      metadata: { status: updated.status },
    });

    return updated;
  }
}
