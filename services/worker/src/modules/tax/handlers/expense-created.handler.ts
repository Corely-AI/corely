import { Injectable, Logger } from "@nestjs/common";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaService } from "@corely/data";

@Injectable()
export class ExpenseCreatedHandler implements EventHandler {
  readonly eventType = "expense.created";
  private readonly logger = new Logger(ExpenseCreatedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as any;
    const { expenseId, totalCents, taxAmountCents, currency, issuedAt } = payload;

    this.logger.log(`Processing Expense Created ${expenseId} for Tax Snapshot`);

    const tax = taxAmountCents ?? 0;
    const subtotal = totalCents - tax;
    const calculatedAt = issuedAt ? new Date(issuedAt) : new Date();

    // Use upsert to handle idempotency (re-processing of same event)
    await this.prisma.taxSnapshot.upsert({
      where: {
        tenantId_sourceType_sourceId: {
          tenantId: event.tenantId,
          sourceType: "EXPENSE",
          sourceId: expenseId,
        },
      },
      update: {
        subtotalAmountCents: subtotal,
        taxTotalAmountCents: tax,
        totalAmountCents: totalCents,
        currency,
        calculatedAt,
      },
      create: {
        tenantId: event.tenantId,
        sourceType: "EXPENSE",
        sourceId: expenseId,
        jurisdiction: "DE", // Defaulting to DE for now
        regime: "STANDARD_VAT",
        roundingMode: "PER_DOCUMENT",
        currency,
        calculatedAt,
        subtotalAmountCents: subtotal,
        taxTotalAmountCents: tax,
        totalAmountCents: totalCents,
        breakdownJson: "{}",
        version: 1,
      },
    });

    this.logger.log(`Created/Updated Tax Snapshot for Expense ${expenseId}`);
  }
}
