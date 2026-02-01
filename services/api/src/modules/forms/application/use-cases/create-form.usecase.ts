import { ValidationFailedError, ConflictError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { CreateFormInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { assertFormName } from "../../domain/form-validation";
import type { FormDefinition } from "../../domain/form-definition.entity";

export class CreateFormUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateFormInput, ctx: UseCaseContext): Promise<FormDefinition> {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    assertFormName(input.name);
    const name = input.name.trim();

    const existing = await this.repo.findFormByName(tenantId, name);
    if (existing) {
      throw new ConflictError("Form name already exists");
    }

    const now = this.clock.now();
    const form: FormDefinition = {
      id: this.idGenerator.newId(),
      tenantId,
      name,
      description: input.description?.trim() ?? null,
      status: "DRAFT",
      publicId: null,
      publicTokenHash: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      fields: [],
    };

    return this.repo.createForm(form);
  }
}
