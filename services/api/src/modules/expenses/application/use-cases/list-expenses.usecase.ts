import { ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ListExpensesInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";

export interface ListExpensesQuery
  extends
    ListExpensesInput,
    Partial<Pick<ListExpensesInput, "status" | "category" | "merchantName">> {
  page: number;
  pageSize: number;
  q?: string;
  sort?: string;
}

export class ListExpensesUseCase {
  constructor(private readonly repo: ExpenseRepositoryPort) {}

  async execute(input: ListExpensesQuery, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const filters = {
      q: input.q ?? input.merchantName,
      merchantName: input.merchantName,
      category: input.category ?? null,
      includeArchived: input.includeArchived,
      fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
      toDate: input.toDate ? new Date(input.toDate) : undefined,
    };

    const { items, total, nextCursor } = await this.repo.list(tenantId, filters, {
      page: input.page,
      pageSize: input.pageSize,
      cursor: input.cursor ?? null,
    });

    const pageInfo = buildPageInfo(total, input.page, input.pageSize);

    return { items, pageInfo, nextCursor };
  }
}
