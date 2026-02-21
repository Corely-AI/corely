import { describe, expect, it } from "vitest";
import { ok, type OutboxMessage, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import { GenerateInvoicesFromEnrollmentBillingPlanUseCase } from "../application/use-cases/generate-invoices-from-enrollment-billing-plan.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { InvoicesWritePort } from "../application/ports/invoices-write.port";
import type { IdempotencyStoragePort } from "../application/ports/idempotency.port";
import type { IdGeneratorPort } from "../application/ports/id-generator.port";
import type { ClockPort } from "../application/ports/clock.port";
import type { AuditPort } from "../application/ports/audit.port";
import type {
  ClassBillingInvoiceLinkEntity,
  ClassEnrollmentBillingPlanEntity,
  ClassEnrollmentEntity,
} from "../domain/entities/classes.entities";

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: { permissions: ["classes.cohort.billing.manage"] },
};

class FakeRepo {
  private readonly links = new Map<string, ClassBillingInvoiceLinkEntity>();
  public enrollment: ClassEnrollmentEntity = {
    id: "enr-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    classGroupId: "group-1",
    studentClientId: "student-1",
    payerClientId: "payer-1",
    status: "ENROLLED",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  public plan: ClassEnrollmentBillingPlanEntity = {
    id: "plan-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    enrollmentId: "enr-1",
    type: "UPFRONT",
    scheduleJson: {
      type: "UPFRONT",
      data: {
        amountCents: 25000,
        currency: "EUR",
      },
    },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  async findEnrollmentById() {
    return this.enrollment;
  }

  async findEnrollmentBillingPlan() {
    return this.plan;
  }

  async findBillingInvoiceLinkByIdempotency(
    _tenantId: string,
    _workspaceId: string,
    idempotencyKey: string
  ) {
    return this.links.get(idempotencyKey) ?? null;
  }

  async createBillingInvoiceLink(link: ClassBillingInvoiceLinkEntity) {
    this.links.set(link.idempotencyKey, link);
    return link;
  }
}

class FakeInvoices implements InvoicesWritePort {
  public createDraftCalls = 0;
  public finalizeCalls = 0;

  async createDraft() {
    this.createDraftCalls += 1;
    return ok({
      invoice: {
        id: `inv-${this.createDraftCalls}`,
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        number: `INV-${this.createDraftCalls}`,
        status: "DRAFT",
        currency: "EUR",
        customerPartyId: "payer-1",
        lineItems: [],
        subtotalCents: 0,
        taxCents: 0,
        totalCents: 0,
        issueDate: "2026-02-01",
        dueDate: "2026-02-01",
        notes: null,
        sourceType: "manual",
        sourceId: null,
        idempotencyKey: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as any);
  }

  async cancel() {
    throw new Error("not implemented");
  }

  async finalize() {
    this.finalizeCalls += 1;
    return ok({
      invoice: {
        id: `inv-${this.finalizeCalls}`,
      },
    } as any);
  }

  async send() {
    throw new Error("not implemented");
  }
}

class FakeAudit implements AuditPort {
  async log() {}
}

class FakeOutbox implements OutboxPort {
  public events: OutboxMessage[] = [];
  async enqueue(message: OutboxMessage): Promise<void> {
    this.events.push(message);
  }
  async enqueueMany(messages: OutboxMessage[]): Promise<void> {
    this.events.push(...messages);
  }
}

class FakeIdempotency implements IdempotencyStoragePort {
  private readonly cache = new Map<string, unknown>();

  async get(actionKey: string, tenantId: string | null, key: string): Promise<any> {
    return this.cache.get(`${actionKey}:${tenantId}:${key}`) ?? null;
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: unknown
  ): Promise<void> {
    this.cache.set(`${actionKey}:${tenantId}:${key}`, response);
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  private sequence = 0;
  newId(): string {
    this.sequence += 1;
    return `id-${this.sequence}`;
  }
}

class FakeClock implements ClockPort {
  now() {
    return new Date("2026-02-21T21:00:00.000Z");
  }
}

describe("GenerateInvoicesFromEnrollmentBillingPlanUseCase", () => {
  it("is idempotent for same Idempotency-Key", async () => {
    const repo = new FakeRepo();
    const invoices = new FakeInvoices();
    const useCase = new GenerateInvoicesFromEnrollmentBillingPlanUseCase(
      repo as unknown as ClassesRepositoryPort,
      invoices,
      new FakeAudit(),
      new FakeOutbox(),
      new FakeIdempotency(),
      new FakeIdGenerator(),
      new FakeClock()
    );

    const first = await useCase.execute(
      {
        enrollmentId: "enr-1",
        idempotencyKey: "idem-1",
      },
      ctx
    );
    const second = await useCase.execute(
      {
        enrollmentId: "enr-1",
        idempotencyKey: "idem-1",
      },
      ctx
    );

    expect(invoices.createDraftCalls).toBe(1);
    expect(first.invoiceIds).toEqual(second.invoiceIds);
    expect(first.links.map((link) => link.invoiceId)).toEqual(
      second.links.map((link) => link.invoiceId)
    );
  });
});
