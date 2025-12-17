import { describe, it, expect, beforeEach } from "vitest";
import { IssueInvoiceUseCase } from "../IssueInvoiceUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { MockOutboxPort } from "@shared/testkit/mocks/mock-outbox-port";
import { MockAuditPort } from "@shared/testkit/mocks/mock-audit-port";
import { MockIdempotencyPort } from "@shared/testkit/mocks/mock-idempotency-port";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { Invoice } from "../../../domain/entities/Invoice";
import { InvoiceLine } from "../../../domain/entities/InvoiceLine";
import { buildIssueInput } from "../../../testkit/builders/build-issue-input";
import { ConflictError } from "@shared/errors/domain-errors";

let useCase: IssueInvoiceUseCase;
let repo: FakeInvoiceRepository;
let outbox: MockOutboxPort;
let audit: MockAuditPort;
let idempotency: MockIdempotencyPort;
let clock: FakeClock;

beforeEach(() => {
  repo = new FakeInvoiceRepository();
  outbox = new MockOutboxPort();
  audit = new MockAuditPort();
  idempotency = new MockIdempotencyPort();
  clock = new FakeClock(new Date("2023-01-01T00:00:00.000Z"));
  useCase = new IssueInvoiceUseCase(repo, outbox, audit, idempotency, clock);
});

describe("IssueInvoiceUseCase", () => {
  const seedInvoice = () => {
    const invoice = new Invoice("invoice-1", "tenant-1", "DRAFT", 1000, "USD", null, [
      new InvoiceLine("line-1", "Item", 1, 1000),
    ]);
    repo.invoices.push(invoice);
    return invoice;
  };

  it("issues a draft invoice and enqueues outbox", async () => {
    const invoice = seedInvoice();
    const result = await useCase.execute(buildIssueInput({ invoiceId: invoice.id }));

    expect(result.status).toBe("ISSUED");
    expect(result.issuedAt).not.toBeNull();
    expect(outbox.events).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });

  it("is idempotent on repeated key", async () => {
    const invoice = seedInvoice();
    const input = buildIssueInput({ invoiceId: invoice.id, idempotencyKey: "repeat" });
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(first.status).toBe("ISSUED");
    expect(second.status).toBe("ISSUED");
    expect(outbox.events).toHaveLength(1);
  });

  it("fails when invoice not draft", async () => {
    const invoice = seedInvoice();
    invoice.status = "ISSUED";
    await expect(
      useCase.execute(buildIssueInput({ invoiceId: invoice.id }))
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
