import { ValidationFailedError, NotFoundError, ConflictError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { AddFieldInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { FormField } from "../../domain/form-definition.entity";
import { assertFieldDefinition, normalizeFieldKey } from "../../domain/form-validation";

export class AddFieldUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(formId: string, input: AddFieldInput, ctx: UseCaseContext) {
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

    const desiredKey = input.key ? normalizeFieldKey(input.key) : normalizeFieldKey(input.label);
    const key = await this.resolveUniqueKey(formId, desiredKey, Boolean(input.key));

    const order =
      typeof input.order === "number" ? input.order : await this.repo.getNextFieldOrder(formId);

    const now = this.clock.now();
    const field: FormField = {
      id: this.idGenerator.newId(),
      tenantId,
      formId,
      key,
      label: input.label.trim(),
      type: input.type,
      required: input.required ?? false,
      helpText: input.helpText?.trim() ?? null,
      order,
      configJson: input.config ?? null,
      createdAt: now,
      updatedAt: now,
    };

    assertFieldDefinition({
      key: field.key,
      label: field.label,
      type: field.type,
      order: field.order,
      required: field.required,
      configJson: field.configJson,
    });

    await this.repo.addField(field);
    const updated = await this.repo.findFormById(tenantId, formId, { includeFields: true });
    if (!updated) {
      throw new NotFoundError("Form not found");
    }
    return updated;
  }

  private async resolveUniqueKey(formId: string, baseKey: string, strict: boolean) {
    if (!(await this.repo.fieldKeyExists(formId, baseKey))) {
      return baseKey;
    }

    if (strict) {
      throw new ConflictError("Field key already exists");
    }

    let counter = 2;
    while (counter < 50) {
      const candidate = `${baseKey}_${counter}`;
      if (!(await this.repo.fieldKeyExists(formId, candidate))) {
        return candidate;
      }
      counter += 1;
    }

    throw new ConflictError("Unable to generate unique field key");
  }
}
