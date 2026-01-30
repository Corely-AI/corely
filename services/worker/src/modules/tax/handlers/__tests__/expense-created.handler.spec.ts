import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@corely/data";
import { ExpenseCreatedHandler } from "../expense-created.handler";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("ExpenseCreatedHandler", () => {
  let handler: ExpenseCreatedHandler;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      taxSnapshot: {
        upsert: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseCreatedHandler,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    handler = module.get<ExpenseCreatedHandler>(ExpenseCreatedHandler);
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  it("should create/update tax snapshot on expense.created", async () => {
    const event = {
      id: "evt-1",
      aggregateId: "exp-1",
      aggregateType: "expense",
      eventType: "expense.created",
      payload: {
        expenseId: "exp-1",
        tenantId: "tenant-1",
        totalCents: 11900,
        taxAmountCents: 1900,
        currency: "EUR",
        issuedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
      },
      createdAt: new Date(),
      tenantId: "tenant-1",
    };

    prisma.taxSnapshot.upsert.mockResolvedValue({});

    await handler.handle(event);

    expect(prisma.taxSnapshot.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_sourceType_sourceId: {
          tenantId: "tenant-1",
          sourceType: "EXPENSE",
          sourceId: "exp-1",
        },
      },
      update: expect.objectContaining({
        subtotalAmountCents: 10000,
        taxTotalAmountCents: 1900,
        totalAmountCents: 11900,
        calculatedAt: new Date("2025-01-01T00:00:00Z"),
      }),
      create: expect.objectContaining({
        tenantId: "tenant-1",
        sourceType: "EXPENSE",
        sourceId: "exp-1",
        subtotalAmountCents: 10000,
        taxTotalAmountCents: 1900,
        totalAmountCents: 11900,
        currency: "EUR",
        calculatedAt: new Date("2025-01-01T00:00:00Z"),
      }),
    });
  });

  it("should handle missing taxAmountCents (default to 0)", async () => {
    const event = {
      id: "evt-2",
      aggregateId: "exp-2",
      aggregateType: "expense",
      eventType: "expense.created",
      payload: {
        expenseId: "exp-2",
        tenantId: "tenant-1",
        totalCents: 5000,
        // taxAmountCents missing
        currency: "USD",
      },
      createdAt: new Date(),
      tenantId: "tenant-1",
    };

    await handler.handle(event);

    expect(prisma.taxSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          taxTotalAmountCents: 0,
          subtotalAmountCents: 5000,
          totalAmountCents: 5000,
        }),
      })
    );
  });
});
