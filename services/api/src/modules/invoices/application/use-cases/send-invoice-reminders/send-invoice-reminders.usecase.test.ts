import { beforeEach, describe, expect, it } from "vitest";
import { SendInvoiceRemindersUseCase } from "./send-invoice-reminders.usecase";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import {
  FixedClock,
  NoopLogger,
  ok,
  isErr,
  type InvoiceReminderStatePort,
  type InvoiceReminderSettingsPort,
  type TenantTimeZonePort,
} from "@corely/kernel";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { SendInvoiceUseCase } from "../send-invoice/send-invoice.usecase";
import type { AuditPort } from "@/shared/ports/audit.port";

class FakeReminderState implements InvoiceReminderStatePort {
  candidates: any[] = [];
  sent: any[] = [];
  stopped: any[] = [];
  released: any[] = [];

  async findByInvoice() {
    return null;
  }
  async upsertInitialState(input: any) {
    return input as any;
  }
  async claimDueReminders() {
    return this.candidates;
  }
  async releaseLock(_tenantId: string, reminderId: string) {
    this.released.push(reminderId);
  }
  async markReminderSent(params: any) {
    this.sent.push(params);
  }
  async markStopped(params: any) {
    this.stopped.push(params);
  }
}

class FakeReminderSettings implements InvoiceReminderSettingsPort {
  async getPolicy() {
    return { startAfterDays: 7, maxReminders: 2, sendOnlyOnWeekdays: false };
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
  async save() {
    return;
  }
  async create() {
    return;
  }
  async isInvoiceNumberTaken() {
    return false;
  }
}

describe("SendInvoiceRemindersUseCase", () => {
  let repo: FakeInvoiceRepo;
  let reminderState: FakeReminderState;
  let reminderSettings: FakeReminderSettings;
  let audit: FakeAudit;
  let useCase: SendInvoiceRemindersUseCase;

  beforeEach(() => {
    repo = new FakeInvoiceRepo();
    reminderState = new FakeReminderState();
    reminderSettings = new FakeReminderSettings();
    audit = new FakeAudit();

    const clock = new FixedClock(new Date("2026-02-06T10:00:00.000Z"));
    const sendInvoice = {
      execute: async () => ok({ deliveryId: "delivery-1", status: "QUEUED" }),
    } as unknown as SendInvoiceUseCase;

    useCase = new SendInvoiceRemindersUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      sendInvoice,
      clock,
      reminderState,
      reminderSettings,
      idGenerator: { newId: () => "lock-1" } as any,
      audit,
      tenantTimeZone: new FakeTenantTimeZone(),
    });
  });

  it("sends reminders and schedules next", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "l1", description: "A", qty: 1, unitPriceCents: 100 }],
      createdAt: new Date(),
    });
    invoice.status = "SENT";
    invoice.billToEmail = "payer@example.com";
    repo.invoices = [invoice];

    reminderState.candidates = [
      {
        id: "rem-1",
        tenantId: "tenant-1",
        workspaceId: "tenant-1",
        invoiceId: "inv-1",
        remindersSent: 0,
        nextReminderAt: new Date("2026-02-06T00:00:00.000Z"),
      },
    ];

    const result = await useCase.execute(
      { limit: 10 },
      { tenantId: "tenant-1", workspaceId: "tenant-1", userId: "system" }
    );

    expect(isErr(result)).toBe(false);
    expect(reminderState.sent).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });

  it("stops when max reminders reached", async () => {
    reminderState.candidates = [
      {
        id: "rem-2",
        tenantId: "tenant-1",
        workspaceId: "tenant-1",
        invoiceId: "inv-2",
        remindersSent: 2,
        nextReminderAt: new Date("2026-02-06T00:00:00.000Z"),
      },
    ];

    const result = await useCase.execute(
      { limit: 10 },
      { tenantId: "tenant-1", workspaceId: "tenant-1", userId: "system" }
    );

    expect(isErr(result)).toBe(false);
    expect(reminderState.stopped).toHaveLength(1);
  });
});
