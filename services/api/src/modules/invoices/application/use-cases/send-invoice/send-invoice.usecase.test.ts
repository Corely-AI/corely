import { beforeEach, describe, expect, it } from "vitest";
import { SendInvoiceUseCase } from "./send-invoice.usecase";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FixedClock, NoopLogger, unwrap } from "@corely/kernel";
import type {
  InvoiceEmailDeliveryRepoPort,
  OutboxPort,
  InvoiceReminderStatePort,
  InvoiceReminderSettingsPort,
  TenantTimeZonePort,
} from "@corely/kernel";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { AuditPort } from "@/shared/ports/audit.port";

class FakeDeliveryRepo implements InvoiceEmailDeliveryRepoPort {
  deliveries: any[] = [];

  async findByIdempotencyKey(_tenantId: string, idempotencyKey: string) {
    return this.deliveries.find((d) => d.idempotencyKey === idempotencyKey) ?? null;
  }

  async findById(_tenantId: string, deliveryId: string) {
    return this.deliveries.find((d) => d.id === deliveryId) ?? null;
  }

  async findByProviderMessageId() {
    return null;
  }

  async create(delivery: any) {
    const record = {
      ...delivery,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deliveries.push(record);
    return record;
  }

  async updateStatus() {
    return;
  }

  async updateStatusByProviderMessageId() {
    return;
  }
}

class FakeOutbox implements OutboxPort {
  events: any[] = [];
  async enqueue(event: any) {
    this.events.push(event);
  }
}

class FakeReminderState implements InvoiceReminderStatePort {
  created: any[] = [];
  async findByInvoice() {
    return null;
  }
  async upsertInitialState(input: any) {
    this.created.push(input);
    return {
      ...input,
      remindersSent: 0,
      nextReminderAt: input.nextReminderAt ?? null,
      lastReminderAt: null,
      lockedAt: null,
      lockedBy: null,
    };
  }
  async claimDueReminders() {
    return [];
  }
  async releaseLock() {
    return;
  }
  async markReminderSent() {
    return;
  }
  async markStopped() {
    return;
  }
}

class FakeReminderSettings implements InvoiceReminderSettingsPort {
  async getPolicy() {
    return { startAfterDays: 7, maxReminders: 3, sendOnlyOnWeekdays: true };
  }
}

class FakeAudit implements AuditPort {
  entries: any[] = [];
  async log(entry: any) {
    this.entries.push(entry);
  }
}

class FakeTenantTimeZone implements TenantTimeZonePort {
  async getTenantTimeZone() {
    return "UTC";
  }
}

class FakeInvoiceRepo implements InvoiceRepoPort {
  invoices: InvoiceAggregate[] = [];
  async findById(tenantId: string, invoiceId: string) {
    return this.invoices.find((i) => i.tenantId === tenantId && i.id === invoiceId) ?? null;
  }
  async list(_workspaceId: string, _filters: any, _pagination: any) {
    return { items: [], total: 0, nextCursor: null };
  }
  async listReminderCandidates(_workspaceId: string, _sentBefore: Date) {
    return [];
  }
  async save(_workspaceId: string, invoice: InvoiceAggregate) {
    const idx = this.invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) {
      this.invoices[idx] = invoice;
    }
  }
  async create() {
    return;
  }
  async isInvoiceNumberTaken() {
    return false;
  }
}

describe("SendInvoiceUseCase", () => {
  let repo: FakeInvoiceRepo;
  let deliveryRepo: FakeDeliveryRepo;
  let outbox: FakeOutbox;
  let reminderState: FakeReminderState;
  let reminderSettings: FakeReminderSettings;
  let audit: FakeAudit;
  let useCase: SendInvoiceUseCase;

  beforeEach(() => {
    repo = new FakeInvoiceRepo();
    deliveryRepo = new FakeDeliveryRepo();
    outbox = new FakeOutbox();
    reminderState = new FakeReminderState();
    reminderSettings = new FakeReminderSettings();
    audit = new FakeAudit();

    const clock = new FixedClock(new Date("2026-02-06T10:00:00.000Z"));
    useCase = new SendInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      deliveryRepo,
      outbox,
      idGenerator: { newId: () => "id-1" } as any,
      clock,
      reminderState,
      reminderSettings,
      audit,
      tenantTimeZone: new FakeTenantTimeZone(),
    });
  });

  it("marks invoice sent and initializes reminder state", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "l1", description: "A", qty: 1, unitPriceCents: 100 }],
      createdAt: new Date(),
    });
    invoice.status = "ISSUED";
    repo.invoices = [invoice];

    const result = await useCase.execute(
      { invoiceId: "inv-1", to: "user@example.com", attachPdf: true },
      { tenantId: "tenant-1", workspaceId: "tenant-1", userId: "user-1" }
    );

    expect(unwrap(result)).toBeDefined();
    expect(invoice.status).toBe("SENT");
    expect(reminderState.created).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
  });

  it("is idempotent when delivery already exists", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-2",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "l1", description: "A", qty: 1, unitPriceCents: 100 }],
      createdAt: new Date(),
    });
    invoice.status = "ISSUED";
    repo.invoices = [invoice];

    deliveryRepo.deliveries.push({
      id: "delivery-1",
      tenantId: "tenant-1",
      invoiceId: "inv-2",
      to: "user@example.com",
      status: "QUEUED",
      provider: "resend",
      idempotencyKey: "idempotent",
    });

    const result = await useCase.execute(
      { invoiceId: "inv-2", to: "user@example.com", attachPdf: true, idempotencyKey: "idempotent" },
      { tenantId: "tenant-1", workspaceId: "tenant-1", userId: "user-1" }
    );

    expect(unwrap(result)).toBeDefined();
    expect(reminderState.created).toHaveLength(1);
    expect(outbox.events).toHaveLength(0);
  });
});
