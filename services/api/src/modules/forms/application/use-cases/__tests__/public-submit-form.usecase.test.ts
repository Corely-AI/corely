import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "crypto";
import { PublicSubmitFormUseCase } from "../public-submit-form.usecase";
import { FakeFormRepository } from "../../../testkit/fakes/fake-form-repo";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import type { FormDefinition } from "../../../domain/form-definition.entity";
import { ForbiddenError } from "@corely/domain";

let repo: FakeFormRepository;
let clock: FakeClock;
let idGen: FakeIdGenerator;

beforeEach(() => {
  repo = new FakeFormRepository();
  clock = new FakeClock(new Date("2025-01-01T10:00:00Z"));
  idGen = new FakeIdGenerator("submission");
});

const seedForm = (overrides: Partial<FormDefinition> = {}): FormDefinition => {
  const form: FormDefinition = {
    id: "form-1",
    tenantId: "tenant-1",
    name: "Public Form",
    description: null,
    status: "DRAFT",
    publicId: "pub-1",
    publicTokenHash: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    fields: [
      {
        id: "field-1",
        tenantId: "tenant-1",
        formId: "form-1",
        key: "email",
        label: "Email",
        type: "EMAIL",
        required: true,
        helpText: null,
        order: 0,
        configJson: null,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      },
    ],
    ...overrides,
  };
  repo.forms.push(form);
  if (form.fields) {
    repo.fields.push(...form.fields);
  }
  return form;
};

describe("PublicSubmitFormUseCase", () => {
  it("rejects submission when form is not published", async () => {
    seedForm();
    const useCase = new PublicSubmitFormUseCase(repo, idGen, clock);

    await expect(
      useCase.execute("pub-1", { token: "abc", payload: { email: "test@example.com" } }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects submission with wrong token", async () => {
    const correctToken = "secret";
    const hash = createHash("sha256").update(correctToken).digest("hex");
    seedForm({ status: "PUBLISHED", publicTokenHash: hash });
    const useCase = new PublicSubmitFormUseCase(repo, idGen, clock);

    await expect(
      useCase.execute("pub-1", { token: "wrong", payload: { email: "test@example.com" } }, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
