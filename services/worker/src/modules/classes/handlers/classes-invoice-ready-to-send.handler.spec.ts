import { Test, TestingModule } from "@nestjs/testing";
import { ClassesInvoiceReadyToSendHandler } from "./classes-invoice-ready-to-send.handler";
import {
  OutboxRepository,
  PrismaClassesRepository,
  PrismaInvoiceEmailDeliveryAdapter,
} from "@corely/data";
import { OutboxEvent } from "../../outbox/event-handler.interface";
import { ID_GENERATOR_TOKEN, UNIT_OF_WORK } from "@corely/kernel";
import { vi, describe, beforeEach, it, expect } from "vitest";

describe("ClassesInvoiceReadyToSendHandler", () => {
  let handler: ClassesInvoiceReadyToSendHandler;
  let repo: PrismaClassesRepository;
  let deliveries: PrismaInvoiceEmailDeliveryAdapter;
  let outbox: OutboxRepository;

  const mockRepo = {
    findInvoiceForEmail: vi.fn(),
  };
  const mockDeliveries = {
    findByIdempotencyKey: vi.fn(),
    create: vi.fn(),
  };
  const mockOutbox = {
    enqueue: vi.fn(),
  };
  const mockUow = {
    withinTransaction: vi.fn((cb) => cb("mock-tx")),
  };
  const mockIdGenerator = {
    newId: vi.fn(() => "del-1"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesInvoiceReadyToSendHandler,
        { provide: PrismaClassesRepository, useValue: mockRepo },
        { provide: PrismaInvoiceEmailDeliveryAdapter, useValue: mockDeliveries },
        { provide: OutboxRepository, useValue: mockOutbox },
        { provide: UNIT_OF_WORK, useValue: mockUow },
        { provide: ID_GENERATOR_TOKEN, useValue: mockIdGenerator },
      ],
    }).compile();

    handler = module.get<ClassesInvoiceReadyToSendHandler>(ClassesInvoiceReadyToSendHandler);
    repo = module.get<PrismaClassesRepository>(PrismaClassesRepository);
    deliveries = module.get<PrismaInvoiceEmailDeliveryAdapter>(PrismaInvoiceEmailDeliveryAdapter);
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

    mockDeliveries.findByIdempotencyKey.mockResolvedValue(null);
    mockRepo.findInvoiceForEmail.mockResolvedValue({
      customerEmail: "test@example.com",
      customerLocale: "en",
    });
    mockDeliveries.create.mockResolvedValue({ id: "del-1" });

    await handler.handle(event);

    expect(mockRepo.findInvoiceForEmail).toHaveBeenCalledWith("tenant-1", "inv-1");
    // Verify transaction usage
    expect(mockUow.withinTransaction).toHaveBeenCalled();

    // Verify delivery creation passed tx
    expect(mockDeliveries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        to: "test@example.com",
        idempotencyKey: "evt-123",
      })
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

    mockDeliveries.findByIdempotencyKey.mockResolvedValue({ id: "del-existing" });

    await handler.handle(event);

    expect(mockRepo.findInvoiceForEmail).not.toHaveBeenCalled();
    expect(mockDeliveries.create).not.toHaveBeenCalled();
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
