import { createHash } from "crypto";
import { ForbiddenError, NotFoundError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { PublicSubmitInput } from "@corely/contracts";
import type { FormRepositoryPort } from "../ports/form-repository.port";
import type { OutboxPort } from "../ports/outbox.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { validateSubmissionPayload } from "../../domain/form-validation";
import type { FormSubmission } from "../../domain/form-definition.entity";

export class PublicSubmitFormUseCase {
  constructor(
    private readonly repo: FormRepositoryPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly outbox: OutboxPort
  ) {}

  async execute(publicId: string, input: PublicSubmitInput, ctx: UseCaseContext) {
    if (!publicId) {
      throw new ValidationFailedError("publicId is required", [
        { message: "publicId is required", members: ["publicId"] },
      ]);
    }

    const form = await this.repo.findFormByPublicId(publicId, { includeFields: true });
    if (!form || form.archivedAt) {
      throw new NotFoundError("Form not found");
    }

    if (form.status !== "PUBLISHED" || !form.publicTokenHash) {
      throw new ForbiddenError("Form is not published");
    }

    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    if (tokenHash !== form.publicTokenHash) {
      throw new ForbiddenError("Invalid token");
    }

    const fields = form.fields ?? [];
    validateSubmissionPayload(fields, input.payload);

    const now = this.clock.now();
    const submissionId = this.idGenerator.newId();
    const submission: FormSubmission = {
      id: submissionId,
      tenantId: form.tenantId,
      formId: form.id,
      source: "PUBLIC",
      payloadJson: input.payload,
      submittedAt: now,
      createdAt: now,
      createdByUserId: null,
    };

    const created = await this.repo.createSubmission(submission);

    if (form.postSubmitAction !== "NONE") {
      await this.outbox.enqueue({
        tenantId: form.tenantId,
        eventType: "Forms.PublicFormSubmitted",
        payload: {
          submissionId: created.id,
          formId: form.id,
          postSubmitAction: form.postSubmitAction,
          payload: created.payloadJson,
        },
        correlationId: created.id,
      });
    }

    return created;
  }
}
