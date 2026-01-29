import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export class FormSubmissionSummaryUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(formId: string, last: number | undefined, ctx: UseCaseContext) {
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

    const pageSize = Math.min(Math.max(last ?? 20, 1), 200);
    const { items } = await this.repo.listSubmissions(tenantId, formId, {}, { page: 1, pageSize });

    const keyCounts: Record<string, number> = {};
    for (const submission of items) {
      for (const key of Object.keys(submission.payloadJson)) {
        keyCounts[key] = (keyCounts[key] ?? 0) + 1;
      }
    }

    return {
      count: items.length,
      lastSubmittedAt: items[0]?.submittedAt ?? null,
      keyCounts,
    };
  }
}
