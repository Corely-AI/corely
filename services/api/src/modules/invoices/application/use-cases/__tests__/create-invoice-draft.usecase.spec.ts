import { describe, it, expect, beforeEach } from "vitest";
import { CreateInvoiceDraftUseCase } from "../CreateInvoiceDraftUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { MockOutboxPort } from "@shared/testkit/mocks/mock-outbox-port";
import { MockAuditPort } from "@shared/testkit/mocks/mock-audit-port";
import { MockIdempotencyPort } from "@shared/testkit/mocks/mock-idempotency-port";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { buildCreateDraftInput } from "../../../testkit/builders/build-create-draft-input";

let useCase: CreateInvoiceDraftUseCase;
let repo: FakeInvoiceRepository;
let outbox: MockOutboxPort;
let audit: MockAuditPort;
let idempotency: MockIdempotencyPort;

beforeEach(() => {
  repo = new FakeInvoiceRepository();
  outbox = new MockOutboxPort();
  audit = new MockAuditPort();
  idempotency = new MockIdempotencyPort();
  useCase = new CreateInvoiceDraftUseCase(
    repo,
    outbox,
    audit,
    idempotency,
    new FakeIdGenerator("inv"),
    new FakeClock()
  );
});

describe("CreateInvoiceDraftUseCase", () => {
  it("creates a draft invoice with lines and audit", async () => {
    const invoice = await useCase.execute(buildCreateDraftInput());

    expect(invoice.status).toBe("DRAFT");
    expect(invoice.lines).toHaveLength(1);
    expect(repo.invoices).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });

  it("is idempotent on repeated key", async () => {
    const input = buildCreateDraftInput({ idempotencyKey: "idem-1" });
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);
    expect(repo.invoices).toHaveLength(1);
  });
});
