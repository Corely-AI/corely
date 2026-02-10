import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassGroupEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class GetClassGroupUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: { classGroupId: string }, ctx: UseCaseContext): Promise<ClassGroupEntity> {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const group = await this.repo.findClassGroupById(tenantId, workspaceId, input.classGroupId);
    if (!group) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }
    return group;
  }
}
