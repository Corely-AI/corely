import { ValidationFailedError, NotFoundError, ConflictError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { UpdateFormInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { assertFormName } from "../../domain/form-validation";
import type { FormDefinition } from "../../domain/form-definition.entity";

export class UpdateFormUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    formId: string,
    input: UpdateFormInput,
    ctx: UseCaseContext
  ): Promise<FormDefinition> {
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

    if (input.name !== undefined) {
      assertFormName(input.name);
      const nextName = input.name.trim();
      if (nextName !== form.name) {
        const existing = await this.repo.findFormByName(tenantId, nextName);
        if (existing && existing.id !== form.id) {
          throw new ConflictError("Form name already exists");
        }
      }
      form.name = nextName;
    }

    if (input.description !== undefined) {
      form.description = input.description?.trim() ?? null;
    }

    form.updatedAt = this.clock.now();

    return this.repo.updateForm(form);
  }
}
