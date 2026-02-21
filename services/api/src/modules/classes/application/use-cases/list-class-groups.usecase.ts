import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import type { ListClassGroupsInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";

export type ListClassGroupsQuery = ListClassGroupsInput & {
  page: number;
  pageSize: number;
};

@RequireTenant()
export class ListClassGroupsUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: ListClassGroupsQuery, ctx: UseCaseContext) {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const { items, total } = await this.repo.listClassGroups(
      tenantId,
      workspaceId,
      {
        q: input.q,
        status: input.status,
        subject: input.subject,
        level: input.level,
        kind: input.kind,
        lifecycle: input.lifecycle,
        startAtFrom: input.startAtFrom ? new Date(input.startAtFrom) : undefined,
        startAtTo: input.startAtTo ? new Date(input.startAtTo) : undefined,
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
