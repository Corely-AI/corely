import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import type { ListClassSessionsInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";

export type ListSessionsQuery = ListClassSessionsInput & {
  page: number;
  pageSize: number;
};

@RequireTenant()
export class ListSessionsUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: ListSessionsQuery, ctx: UseCaseContext) {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const { items, total } = await this.repo.listSessions(
      tenantId,
      workspaceId,
      {
        q: input.q,
        classGroupId: input.classGroupId,
        status: input.status,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
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
