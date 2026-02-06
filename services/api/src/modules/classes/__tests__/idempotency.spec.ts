import { describe, expect, it } from "vitest";
import { ok, type UseCaseContext } from "@corely/kernel";
import { CreateMonthlyBillingRunUseCase } from "../application/use-cases/create-monthly-billing-run.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { InvoicesWritePort } from "../application/ports/invoices-write.port";
import type { AuditPort } from "../application/ports/audit.port";
import type { OutboxPort } from "../application/ports/outbox.port";
import type { IdempotencyStoragePort } from "../application/ports/idempotency.port";
import type { IdGeneratorPort } from "../application/ports/id-generator.port";
import type { ClockPort } from "../application/ports/clock.port";
import type { ClassesSettingsRepositoryPort } from "../application/ports/classes-settings-repository.port";

const buildCtx = (): UseCaseContext => ({
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: {},
});

class FakeIdempotency implements IdempotencyStoragePort {
  private storeMap = new Map<string, any>();
  async get(actionKey: string, tenantId: string | null, key: string) {
    return this.storeMap.get(`${actionKey}:${tenantId}:${key}`) ?? null;
  }
  async store(actionKey: string, tenantId: string | null, key: string, response: any) {
    this.storeMap.set(`${actionKey}:${tenantId}:${key}`, response);
  }
}

class FakeRepo implements ClassesRepositoryPort {
  public runs = new Map<string, any>();
  public links = new Map<string, any>();
  async createClassGroup() {
    throw new Error("not implemented");
  }
  async updateClassGroup() {
    throw new Error("not implemented");
  }
  async findClassGroupById() {
    throw new Error("not implemented");
  }
  async listClassGroups() {
    throw new Error("not implemented");
  }
  async listClassGroupsWithSchedulePattern() {
    return [];
  }
  async createSession() {
    throw new Error("not implemented");
  }
  async upsertSession() {
    throw new Error("not implemented");
  }
  async updateSession() {
    throw new Error("not implemented");
  }
  async findSessionById() {
    throw new Error("not implemented");
  }
  async listSessions() {
    throw new Error("not implemented");
  }
  async upsertEnrollment() {
    throw new Error("not implemented");
  }
  async updateEnrollment() {
    throw new Error("not implemented");
  }
  async findEnrollmentById() {
    throw new Error("not implemented");
  }
  async listEnrollments() {
    throw new Error("not implemented");
  }
  async listAttendanceBySession() {
    throw new Error("not implemented");
  }
  async bulkUpsertAttendance() {
    throw new Error("not implemented");
  }
  async listBillableAttendanceForMonth() {
    return [
      {
        payerClientId: "client-a",
        classGroupId: "group-1",
        classGroupName: "Math",
        priceCents: 2000,
        currency: "EUR",
      },
      {
        payerClientId: "client-a",
        classGroupId: "group-1",
        classGroupName: "Math",
        priceCents: 2000,
        currency: "EUR",
      },
      {
        payerClientId: "client-b",
        classGroupId: "group-2",
        classGroupName: "Science",
        priceCents: 1500,
        currency: "EUR",
      },
    ];
  }
  async listBillableScheduledForMonth() {
    return [];
  }
  async findBillingRunByMonth(tenantId: string, workspaceId: string, month: string) {
    return this.runs.get(`${tenantId}:${workspaceId}:${month}`) ?? null;
  }
  async listBillingRunsByMonths(tenantId: string, workspaceId: string, months: string[]) {
    return months
      .map((month) => this.runs.get(`${tenantId}:${workspaceId}:${month}`))
      .filter(Boolean);
  }
  async findBillingRunById() {
    throw new Error("not implemented");
  }
  async createBillingRun(run: any) {
    this.runs.set(`${run.tenantId}:${run.workspaceId}:${run.month}`, run);
    return run;
  }
  async updateBillingRun(
    tenantId: string,
    workspaceId: string,
    billingRunId: string,
    updates: any
  ) {
    const run = Array.from(this.runs.values()).find((r) => r.id === billingRunId);
    if (!run) {
      throw new Error("missing run");
    }
    const next = { ...run, ...updates };
    this.runs.set(`${tenantId}:${workspaceId}:${run.month}`, next);
    return next;
  }
  async listBillingInvoiceLinks(tenantId: string, workspaceId: string, billingRunId: string) {
    return Array.from(this.links.values()).filter((link) => link.billingRunId === billingRunId);
  }
  async findBillingInvoiceLinkByIdempotency(
    tenantId: string,
    workspaceId: string,
    idempotencyKey: string
  ) {
    return this.links.get(`${tenantId}:${workspaceId}:${idempotencyKey}`) ?? null;
  }
  async createBillingInvoiceLink(link: any) {
    this.links.set(`${link.tenantId}:${link.workspaceId}:${link.idempotencyKey}`, link);
    return link;
  }
  async isMonthLocked() {
    return false;
  }
}

class FakeSettingsRepo implements ClassesSettingsRepositoryPort {
  async getSettings() {
    return {
      billingMonthStrategy: "ARREARS_PREVIOUS_MONTH",
      billingBasis: "ATTENDED_SESSIONS",
      bankAccount: null,
      paymentReferenceTemplate: null,
    };
  }
  async updateSettings() {
    throw new Error("not implemented");
  }
}

class FakeInvoices implements InvoicesWritePort {
  public createCalls = 0;
  async createDraft(input: any) {
    this.createCalls += 1;
    return ok({ invoice: { id: `inv-${this.createCalls}` } } as any);
  }
  async send() {
    return ok({} as any);
  }
}

class FakeAudit implements AuditPort {
  async log() {
    return;
  }
}

class FakeOutbox implements OutboxPort {
  async enqueue() {
    return;
  }
}

class FakeIdGen implements IdGeneratorPort {
  private i = 0;
  newId(): string {
    this.i += 1;
    return `id-${this.i}`;
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return new Date("2024-02-01T00:00:00.000Z");
  }
}

describe("classes billing idempotency", () => {
  it("does not create duplicate invoices for the same month", async () => {
    const repo = new FakeRepo();
    const invoices = new FakeInvoices();
    const audit = new FakeAudit();
    const outbox = new FakeOutbox();
    const idempotency = new FakeIdempotency();
    const idGen = new FakeIdGen();
    const clock = new FakeClock();
    const settingsRepo = new FakeSettingsRepo();

    const useCase = new CreateMonthlyBillingRunUseCase(
      repo,
      settingsRepo,
      invoices,
      audit,
      outbox,
      idempotency,
      idGen,
      clock
    );

    const ctx = buildCtx();
    await useCase.execute({ month: "2024-01", createInvoices: true }, ctx);
    await useCase.execute({ month: "2024-01", createInvoices: true }, ctx);

    expect(invoices.createCalls).toBe(2);
    expect(repo.links.size).toBe(2);
  });
});
