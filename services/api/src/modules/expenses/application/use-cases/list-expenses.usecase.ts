import { ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { CustomFieldFilter, DimensionFilter, ListExpensesInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import type {
  ResolveEntityIdsByCustomFieldFiltersUseCase,
  ResolveEntityIdsByDimensionFiltersUseCase,
} from "../../../platform-custom-attributes";

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
  constructor(
    private readonly repo: ExpenseRepositoryPort,
    private readonly resolveByDimensions: ResolveEntityIdsByDimensionFiltersUseCase,
    private readonly resolveByCustomFields: ResolveEntityIdsByCustomFieldFiltersUseCase
  ) {}

  async execute(input: ListExpensesQuery, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const dimensionFilters = ((input as any).dimensionFilters ?? []) as DimensionFilter[];
    const customFieldFilters = ((input as any).customFieldFilters ?? []) as CustomFieldFilter[];

    let scopedEntityIds: string[] | undefined;
    if (dimensionFilters.length > 0) {
      const ids = await this.resolveByDimensions.execute(tenantId, "expense", dimensionFilters);
      if (ids.length === 0) {
        return {
          items: [],
          pageInfo: buildPageInfo(0, input.page, input.pageSize),
          nextCursor: null,
        };
      }
      scopedEntityIds = ids;
    }

    if (customFieldFilters.length > 0) {
      const ids = await this.resolveByCustomFields.execute(tenantId, "expense", customFieldFilters);
      if (ids.length === 0) {
        return {
          items: [],
          pageInfo: buildPageInfo(0, input.page, input.pageSize),
          nextCursor: null,
        };
      }
      scopedEntityIds = scopedEntityIds ? scopedEntityIds.filter((id) => ids.includes(id)) : ids;
      if (scopedEntityIds.length === 0) {
        return {
          items: [],
          pageInfo: buildPageInfo(0, input.page, input.pageSize),
          nextCursor: null,
        };
      }
    }

    if (scopedEntityIds && scopedEntityIds.length > 5000) {
      throw new ValidationFailedError("Filtered result exceeds safe ID window", [
        {
          message: "Filtered ID set exceeds 5000. Use narrower filters.",
          members: ["dimensionFilters", "customFieldFilters"],
        },
      ]);
    }

    const filters = {
      q: input.q ?? input.merchantName,
      merchantName: input.merchantName,
      category: input.category ?? null,
      status: input.status ?? undefined,
      includeArchived: input.includeArchived,
      fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
      toDate: input.toDate ? new Date(input.toDate) : undefined,
      sort: input.sort,
      structuredFilters: (input as any).filters,
      entityIds: scopedEntityIds,
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
