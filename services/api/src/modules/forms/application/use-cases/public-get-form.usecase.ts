import { NotFoundError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { PublicFormDto } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";

export class PublicGetFormUseCase {
  constructor(private readonly repo: FormRepositoryPort) {}

  async execute(publicId: string, ctx: UseCaseContext): Promise<PublicFormDto> {
    if (!publicId) {
      throw new ValidationFailedError("publicId is required", [
        { message: "publicId is required", members: ["publicId"] },
      ]);
    }

    const form = await this.repo.findFormByPublicId(publicId, { includeFields: true });
    if (!form || form.archivedAt || form.status !== "PUBLISHED") {
      throw new NotFoundError("Form not found");
    }

    return {
      name: form.name,
      description: form.description ?? null,
      fields: (form.fields ?? []).map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        helpText: field.helpText ?? null,
        order: field.order,
        configJson: field.configJson ?? null,
      })),
    };
  }
}
