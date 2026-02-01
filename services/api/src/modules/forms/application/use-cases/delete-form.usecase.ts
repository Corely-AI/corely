import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";

export class DeleteFormUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(formId: string, ctx: UseCaseContext): Promise<void> {
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

    form.archivedAt = this.clock.now();
    form.updatedAt = this.clock.now();
    await this.repo.updateForm(form);
  }
}
