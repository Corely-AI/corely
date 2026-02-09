import { Test, TestingModule } from "@nestjs/testing";
import { ClassesInvoiceReadyToSendHandler } from "./classes-invoice-ready-to-send.handler";
import { OutboxRepository, PrismaClassesRepository } from "@corely/data";
import { PrismaInvoiceEmailRepository } from "../../invoices/infrastructure/prisma-invoice-email-repository.adapter";
import { OutboxEvent } from "../../outbox/event-handler.interface";
import { UNIT_OF_WORK } from "@corely/kernel";
import { vi, describe, beforeEach, it, expect } from "vitest";

describe("ClassesInvoiceReadyToSendHandler", () => {
  let handler: ClassesInvoiceReadyToSendHandler;
  let repo: PrismaClassesRepository;
  let emails: PrismaInvoiceEmailRepository;
  let outbox: OutboxRepository;

  const mockRepo = {
    findInvoiceForEmail: vi.fn(),
  };
  const mockEmails = {
    findDeliveryByIdempotency: vi.fn(),
    createDelivery: vi.fn(),
  };
  const mockOutbox = {
    enqueue: vi.fn(),
  };
  const mockUow = {
    withinTransaction: vi.fn((cb) => cb("mock-tx")),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesInvoiceReadyToSendHandler,
        { provide: PrismaClassesRepository, useValue: mockRepo },
        { provide: PrismaInvoiceEmailRepository, useValue: mockEmails },
        { provide: OutboxRepository, useValue: mockOutbox },
        { provide: UNIT_OF_WORK, useValue: mockUow },
      ],
    }).compile();

    handler = module.get<ClassesInvoiceReadyToSendHandler>(ClassesInvoiceReadyToSendHandler);
    repo = module.get<PrismaClassesRepository>(PrismaClassesRepository);
    emails = module.get<PrismaInvoiceEmailRepository>(PrismaInvoiceEmailRepository);
    outbox = module.get<OutboxRepository>(OutboxRepository);

    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  it("should process valid event within transaction", async () => {
    const event: OutboxEvent = {
      id: "evt-123",
      tenantId: "tenant-1",
      eventType: "classes.invoice.ready_to_send",
      payload: { tenantId: "tenant-1", invoiceId: "inv-1" },
    };

    mockEmails.findDeliveryByIdempotency.mockResolvedValue(null);
    mockRepo.findInvoiceForEmail.mockResolvedValue({
      customerEmail: "test@example.com",
      customerLocale: "en",
    });
    mockEmails.createDelivery.mockResolvedValue({ id: "del-1" });

    await handler.handle(event);

    expect(mockRepo.findInvoiceForEmail).toHaveBeenCalledWith("tenant-1", "inv-1");
    // Verify transaction usage
    expect(mockUow.withinTransaction).toHaveBeenCalled();

    // Verify delivery creation passed tx
    expect(mockEmails.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        to: "test@example.com",
        idempotencyKey: "evt-123",
      }),
      "mock-tx"
    );

    // Verify enqueue passed tx
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "invoice.email.requested",
        payload: expect.objectContaining({
          deliveryId: "del-1",
          to: "test@example.com",
        }),
      }),
      "mock-tx"
    );
  });

  it("should skip if delivery exists (idempotency)", async () => {
    const event: OutboxEvent = {
      id: "evt-123",
      tenantId: "tenant-1",
      eventType: "classes.invoice.ready_to_send",
      payload: { tenantId: "tenant-1", invoiceId: "inv-1" },
    };

    mockEmails.findDeliveryByIdempotency.mockResolvedValue({ id: "del-existing" });

    await handler.handle(event);

    expect(mockRepo.findInvoiceForEmail).not.toHaveBeenCalled();
    expect(mockEmails.createDelivery).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it("should log error on mismatch tenantId", async () => {
    const event: OutboxEvent = {
      id: "evt-123",
      tenantId: "tenant-1",
      eventType: "classes.invoice.ready_to_send",
      payload: { tenantId: "tenant-2", invoiceId: "inv-1" }, // Mismatch
    };

    await handler.handle(event);

    expect(mockRepo.findInvoiceForEmail).not.toHaveBeenCalled();
  });
});
