import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export class GetFormSubmissionUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(formId: string, submissionId: string, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const submission = await this.repo.getSubmissionById(tenantId, formId, submissionId);
    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    return submission;
  }
}
