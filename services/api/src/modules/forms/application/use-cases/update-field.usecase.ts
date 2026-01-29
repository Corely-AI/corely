import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { UpdateFieldInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { assertFieldDefinition } from "../../domain/form-validation";

export class UpdateFieldUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(formId: string, fieldId: string, input: UpdateFieldInput, ctx: UseCaseContext) {
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

    if (input.label !== undefined) {
      field.label = input.label.trim();
    }
    if (input.required !== undefined) {
      field.required = input.required;
    }
    if (input.helpText !== undefined) {
      field.helpText = input.helpText?.trim() ?? null;
    }
    if (input.order !== undefined) {
      field.order = input.order;
    }
    if (input.config !== undefined) {
      field.configJson = input.config ?? null;
    }

    field.updatedAt = this.clock.now();

    assertFieldDefinition({
      key: field.key,
      label: field.label,
      type: field.type,
      order: field.order,
      required: field.required,
      configJson: field.configJson,
    });

    await this.repo.updateField(field);
    const updated = await this.repo.findFormById(tenantId, formId, { includeFields: true });
    if (!updated) {
      throw new NotFoundError("Form not found");
    }
    return updated;
  }
}
