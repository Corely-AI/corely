import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ListFormSubmissionsInput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export interface ListFormSubmissionsQuery extends ListFormSubmissionsInput {
  page: number;
  pageSize: number;
}

export class ListFormSubmissionsUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(formId: string, input: ListFormSubmissionsQuery, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const form = await this.repo.findFormById(tenantId, formId, { includeFields: false });
    if (!form || form.archivedAt) {
      throw new NotFoundError("Form not found");
    }

    const { items, total, nextCursor } = await this.repo.listSubmissions(
      tenantId,
      formId,
      { source: input.source },
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
