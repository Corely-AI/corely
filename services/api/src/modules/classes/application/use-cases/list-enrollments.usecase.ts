import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import type { ListEnrollmentsInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";

export type ListEnrollmentsQuery = ListEnrollmentsInput & { page: number; pageSize: number };

@RequireTenant()
export class ListEnrollmentsUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: ListEnrollmentsQuery, ctx: UseCaseContext) {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const { items, total } = await this.repo.listEnrollments(
      tenantId,
      workspaceId,
      {
        q: input.q,
        classGroupId: input.classGroupId,
        clientId: input.clientId,
        isActive: input.isActive,
        sort: input.sort,
        filters: input.filters,
      },
      { page: input.page, pageSize: input.pageSize }
    );

    return {
      items,
      pageInfo: buildPageInfo(total, input.page, input.pageSize),
    };
  }
}
