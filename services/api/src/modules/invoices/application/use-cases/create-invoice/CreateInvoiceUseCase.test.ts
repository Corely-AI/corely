import { beforeEach, describe, expect, it } from "vitest";
import { CreateInvoiceUseCase } from "./CreateInvoiceUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { FakeIdGenerator, NoopLogger, unwrap } from "@kerniflow/kernel";

describe("CreateInvoiceUseCase", () => {
  let useCase: CreateInvoiceUseCase;
  let repo: FakeInvoiceRepository;

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    useCase = new CreateInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      idGenerator: new FakeIdGenerator(["inv-1", "line-1"]),
    });
  });

  it("creates a draft invoice with totals", async () => {
    const result = await useCase.execute(
      {
        customerId: "cust-1",
        currency: "USD",
        lineItems: [{ description: "Work", qty: 2, unitPriceCents: 500 }],
      },
      { tenantId: "tenant-1" }
    );

    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("DRAFT");
    expect(dto.totals.totalCents).toBe(1000);
    expect(repo.invoices).toHaveLength(1);
  });
});
