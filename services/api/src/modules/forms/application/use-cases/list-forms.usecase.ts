import { ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ListFormsInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export interface ListFormsQuery extends ListFormsInput {
  page: number;
  pageSize: number;
  q?: string;
  sort?: string;
}

export class ListFormsUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(input: ListFormsQuery, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const { items, total, nextCursor } = await this.repo.listForms(
      tenantId,
      {
        q: input.q,
        status: input.status,
        includeArchived: input.includeArchived,
        sort: input.sort,
      },
      {
        page: input.page,
        pageSize: input.pageSize,
        cursor: input.cursor ?? null,
      }
    );

    const pageInfo = buildPageInfo(total, input.page, input.pageSize);
    return { items, pageInfo, nextCursor };
  }
}
