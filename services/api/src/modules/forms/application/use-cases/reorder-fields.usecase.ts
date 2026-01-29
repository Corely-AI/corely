import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ReorderFieldsInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export class ReorderFieldsUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(formId: string, input: ReorderFieldsInput, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const form = await this.repo.findFormById(tenantId, formId, { includeFields: true });
    if (!form || form.archivedAt) {
      throw new NotFoundError("Form not found");
    }

    const existingIds = new Set((form.fields ?? []).map((field) => field.id));
    const missing = input.fieldIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new ValidationFailedError("Unknown field ids", [
        { message: "Unknown field ids", members: ["fieldIds"] },
      ]);
    }

    const orders = input.fieldIds.map((fieldId, index) => ({ fieldId, order: index }));
    await this.repo.reorderFields(tenantId, formId, orders);

    const updated = await this.repo.findFormById(tenantId, formId, { includeFields: true });
    if (!updated) {
      throw new NotFoundError("Form not found");
    }
    return updated;
  }
}
