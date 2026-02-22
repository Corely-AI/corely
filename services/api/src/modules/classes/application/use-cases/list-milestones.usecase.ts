import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";

@RequireTenant()
export class ListMilestonesUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: { classGroupId: string }, ctx: UseCaseContext) {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    return this.repo.listMilestonesByClassGroup(tenantId, workspaceId, input.classGroupId);
  }
}
