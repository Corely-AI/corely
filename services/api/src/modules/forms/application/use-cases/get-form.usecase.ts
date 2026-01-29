import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { FormDefinition } from "../../domain/form-definition.entity";

export class GetFormUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(formId: string, ctx: UseCaseContext): Promise<FormDefinition> {
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

    return form;
  }
}
