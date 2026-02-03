import type { ListIssuesRequest } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import { assertCan } from "@/shared/policies/assert-can";
import type { IssueRepositoryPort } from "../ports/issue-repository.port";
import type { IssueListResult } from "../ports/issue-repository.port";

@RequireTenant()
export class ListIssuesUseCase {
  constructor(private readonly issueRepo: IssueRepositoryPort) {}

  async execute(input: ListIssuesRequest, ctx: UseCaseContext): Promise<IssueListResult> {
    assertCan(ctx);
    const tenantId = ctx.tenantId!;

    return this.issueRepo.list(
      tenantId,
      {
        q: input.q,
        status: input.status,
        priority: input.priority,
        siteType: input.siteType,
        assigneeUserId: input.assigneeUserId,
        reporterUserId: input.reporterUserId,
        customerPartyId: input.customerPartyId,
        manufacturerPartyId: input.manufacturerPartyId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        sort: input.sort,
        structuredFilters: input.filters,
      },
      { page: input.page, pageSize: input.pageSize }
    );
  }
}
