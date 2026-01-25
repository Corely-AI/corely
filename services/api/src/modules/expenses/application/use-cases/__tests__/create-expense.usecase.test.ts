import { describe, it, expect, beforeEach } from "vitest";
import { CreateExpenseUseCase } from "../create-expense.usecase";
import { FakeExpenseRepository } from "../../../testkit/fakes/fake-expense-repo";
import { MockAuditPort } from "@shared/testkit/mocks/mock-audit-port";
import { MockOutboxPort } from "@shared/testkit/mocks/mock-outbox-port";
import { MockIdempotencyStoragePort } from "@shared/testkit/mocks/mock-idempotency-port";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { buildCreateExpenseInput } from "../../../testkit/builders/build-create-expense-input";
import { CustomFieldDefinitionPort, CustomFieldIndexPort } from "@corely/domain";

let useCase: CreateExpenseUseCase;
let repo: FakeExpenseRepository;
let audit: MockAuditPort;
let outbox: MockOutboxPort;
let idempotency: MockIdempotencyStoragePort;
let customDefs: CustomFieldDefinitionPort;
let customIndexes: CustomFieldIndexPort;
let workspaceRepo: any;
let templateService: any;

beforeEach(() => {
  repo = new FakeExpenseRepository();
  audit = new MockAuditPort();
  outbox = new MockOutboxPort();
  idempotency = new MockIdempotencyStoragePort();
  customDefs = {
    listActiveByEntityType: async () => [],
    getById: async () => null,
    upsert: async (def: any) => def,
    softDelete: async () => {},
  };
  customIndexes = {
    upsertIndexesForEntity: async () => {},
    deleteIndexesForEntity: async () => {},
  };

  // Mock workspace repository
  workspaceRepo = {
    getWorkspaceByIdWithLegalEntity: async () => ({
      id: "ws-1",
      legalEntity: {
        kind: "PERSONAL", // Freelancer mode
      },
    }),
  };

  // Mock template service
  templateService = {
    getDefaultCapabilities: (kind: string) => ({
      approvals: false, // Freelancer mode: no approvals
    }),
  };

  useCase = new CreateExpenseUseCase(
    repo,
    outbox,
    audit,
    idempotency,
    new FakeIdGenerator("exp"),
    new FakeClock(),
    customDefs,
    customIndexes,
    workspaceRepo,
    templateService
  );
});

describe("CreateExpenseUseCase", () => {
  it("creates an expense, audit and outbox entry", async () => {
    const expense = await useCase.execute(buildCreateExpenseInput(), {
      tenantId: "tenant-1",
      userId: "user-1",
      workspaceId: "ws-1",
    });

    expect(repo.expenses).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
    expect(expense.totalCents).toBe(500);
    expect(expense.status).toBe("APPROVED"); // Freelancer mode auto-approves
  });

  it("is idempotent for same key", async () => {
    const input = buildCreateExpenseInput({ idempotencyKey: "same" });
    const ctx = { tenantId: "tenant-1", userId: "user-1", workspaceId: "ws-1" };
    const first = await useCase.execute(input, ctx);
    const second = await useCase.execute(input, ctx);

    expect(second.id).toBe(first.id);
    expect(repo.expenses).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
  });
});
