import { ConflictError, NotFoundError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { PublishFormInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { createHash, randomBytes } from "crypto";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const randomBase62 = (length: number) => {
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((byte) => BASE62[byte % BASE62.length])
    .join("");
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class PublishFormUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(formId: string, input: PublishFormInput, ctx: UseCaseContext) {
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

    if (form.status === "PUBLISHED" && !input.regenerateToken) {
      throw new ConflictError("Form already published");
    }

    if (!form.publicId) {
      form.publicId = await this.generateUniquePublicId();
    }

    const token = randomBytes(32).toString("base64url");
    form.publicTokenHash = hashToken(token);
    form.status = "PUBLISHED";
    form.publishedAt = this.clock.now();
    form.updatedAt = this.clock.now();

    await this.repo.updateForm(form);
    return { publicId: form.publicId, token };
  }

  private async generateUniquePublicId() {
    let attempt = 0;
    while (attempt < 10) {
      const candidate = randomBase62(12);
      const existing = await this.repo.findFormByPublicId(candidate);
      if (!existing) {
        return candidate;
      }
      attempt += 1;
    }
    throw new ConflictError("Unable to generate unique public id");
  }
}
