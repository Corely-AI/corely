import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export class RemoveFieldUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(formId: string, fieldId: string, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const field = await this.repo.findFieldById(tenantId, formId, fieldId);
    if (!field) {
      throw new NotFoundError("Field not found");
    }

    await this.repo.removeField(tenantId, formId, fieldId);
    const updated = await this.repo.findFormById(tenantId, formId, { includeFields: true });
    if (!updated) {
      throw new NotFoundError("Form not found");
    }
    return updated;
  }
}
