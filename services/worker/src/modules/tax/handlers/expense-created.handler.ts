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
    const { expenseId, totalCents, taxAmountCents, currency } = payload;

    this.logger.log(`Processing Expense Created ${expenseId} for Tax Snapshot`);

    const tax = taxAmountCents ?? 0;
    const subtotal = totalCents - tax;

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
        // If it exists, we might want to update it if the expense changed?
        // For "created" event, usually it means first time.
        // If we implement expense.updated, we would update.
        // For now, let's update values to be safe.
        subtotalAmountCents: subtotal,
        taxTotalAmountCents: tax,
        totalAmountCents: totalCents,
        currency,
      },
      create: {
        tenantId: event.tenantId,
        sourceType: "EXPENSE",
        sourceId: expenseId,
        jurisdiction: "DE", // Defaulting to DE for now
        regime: "STANDARD_VAT",
        roundingMode: "PER_DOCUMENT",
        currency,
        calculatedAt: new Date(),
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
