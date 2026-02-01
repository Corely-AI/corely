import { describe, it, expect, beforeEach } from "vitest";
import { PublishFormUseCase } from "../publish-form.usecase";
import { UnpublishFormUseCase } from "../unpublish-form.usecase";
import { FakeFormRepository } from "../../../testkit/fakes/fake-form-repo";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import type { FormDefinition } from "../../../domain/form-definition.entity";
import { ConflictError } from "@corely/domain";

let repo: FakeFormRepository;
let clock: FakeClock;

beforeEach(() => {
  repo = new FakeFormRepository();
  clock = new FakeClock(new Date("2025-01-01T10:00:00Z"));
});

const seedForm = (overrides: Partial<FormDefinition> = {}): FormDefinition => {
  const form: FormDefinition = {
    id: "form-1",
    tenantId: "tenant-1",
    name: "Test Form",
    description: null,
    status: "DRAFT",
    publicId: null,
    publicTokenHash: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    fields: [],
    ...overrides,
  };
  repo.forms.push(form);
  return form;
};

describe("PublishFormUseCase", () => {
  it("publishes and unpublishes with token hash", async () => {
    seedForm();
    const publish = new PublishFormUseCase(repo, clock);
    const unpublish = new UnpublishFormUseCase(repo, clock);

    const result = await publish.execute("form-1", {}, { tenantId: "tenant-1", userId: "user-1" });

    expect(result.publicId).toBeDefined();
    expect(result.token).toBeDefined();

    const updated = await repo.findFormById("tenant-1", "form-1", { includeFields: false });
    expect(updated?.status).toBe("PUBLISHED");
    expect(updated?.publicTokenHash).toBeTruthy();

    const afterUnpublish = await unpublish.execute("form-1", {
      tenantId: "tenant-1",
      userId: "user-1",
    });
    expect(afterUnpublish.status).toBe("DRAFT");
    expect(afterUnpublish.publicTokenHash).toBeNull();
  });

  it("throws when publishing an already published form without regenerate", async () => {
    seedForm({ status: "PUBLISHED", publicId: "pub-1", publicTokenHash: "hash" });
    const publish = new PublishFormUseCase(repo, clock);

    await expect(
      publish.execute("form-1", {}, { tenantId: "tenant-1", userId: "user-1" })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
