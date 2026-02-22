import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ListProgramsInput } from "@corely/contracts/classes";
import { buildPageInfo } from "@/shared/http/pagination";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanProgramsView } from "../../policies/assert-can-classes";

export type ListProgramsQuery = ListProgramsInput & {
  page: number;
  pageSize: number;
};

@RequireTenant()
export class ListProgramsUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: ListProgramsQuery, ctx: UseCaseContext) {
    assertCanProgramsView(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const { items, total } = await this.repo.listPrograms(
      tenantId,
      workspaceId,
      {
        q: input.q,
        levelTag: input.levelTag,
        sort: input.sort,
      },
      { page: input.page, pageSize: input.pageSize }
    );

    return {
      items,
      pageInfo: buildPageInfo(total, input.page, input.pageSize),
    };
  }
}
