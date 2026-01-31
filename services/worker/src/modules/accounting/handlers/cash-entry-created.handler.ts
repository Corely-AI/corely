import { Injectable, Logger } from "@nestjs/common";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaService } from "@corely/data";

@Injectable()
export class CashEntryCreatedHandler implements EventHandler {
  readonly eventType = "cash.entry.created";
  private readonly logger = new Logger(CashEntryCreatedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: OutboxEvent): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = event.payload as any;
    const { entryId, amountCents, type, sourceType, businessDate } = payload;

    this.logger.log(`Processing Cash Entry ${entryId} (${type} ${amountCents}) from ${sourceType}`);

    // Idempotency check (simple version: check if Journal Entry already exists with this sourceId)
    // NOTE: Casting to any because Prisma enum type in generated client might lag behind or differ slightly in strict checks
    // The value "CashEntry" was added to the schema.
    const existing = await this.prisma.journalEntry.findFirst({
      where: {
        sourceId: entryId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceType: "CashEntry" as any,
        tenantId: event.tenantId,
      },
    });

    if (existing) {
      this.logger.warn(`Journal Entry for Cash Entry ${entryId} already exists. Skipping.`);
      return;
    }

    // Determine Accounts (Hardcoded MVP)
    // TODO: Fetch from settings
    const CASH_ACCOUNT_CODE = "1000";
    const SALES_REVENUE_CODE = "4000";
    const SUSPENSE_CODE = "9999";
    const GENERAL_EXPENSE_CODE = "6000";

    // Lookup Account IDs
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: {
        tenantId: event.tenantId,
        code: { in: [CASH_ACCOUNT_CODE, SALES_REVENUE_CODE, SUSPENSE_CODE, GENERAL_EXPENSE_CODE] },
      },
    });

    const getAccountId = (code: string) => accounts.find((a) => a.code === code)?.id;

    // Fail if Cash Account missing (critical)
    const cashAccountId = getAccountId(CASH_ACCOUNT_CODE);
    if (!cashAccountId) {
      this.logger.warn(
        `Cash Account ${CASH_ACCOUNT_CODE} not found. Creating journal entry skipped (Configuration missing).`
      );
      return;
      // Optionally throw to retry when config is fixed?
      // For now, return to avoid clogging queue.
    }

    let debitAccountId: string | undefined;
    let creditAccountId: string | undefined;

    if (type === "IN") {
      debitAccountId = cashAccountId;
      if (sourceType === "SALES" || sourceType === "SALE") {
        creditAccountId = getAccountId(SALES_REVENUE_CODE) || getAccountId(SUSPENSE_CODE);
      } else {
        creditAccountId = getAccountId(SUSPENSE_CODE);
      }
    } else {
      // OUT
      creditAccountId = cashAccountId;
      if (sourceType === "EXPENSE") {
        debitAccountId = getAccountId(GENERAL_EXPENSE_CODE) || getAccountId(SUSPENSE_CODE);
      } else {
        debitAccountId = getAccountId(SUSPENSE_CODE);
      }
    }

    if (!debitAccountId || !creditAccountId) {
      this.logger.error("Could not determine Debit or Credit account. Skipping.");
      return;
    }

    // Create Posted Journal Entry
    // We skip the "Draft" phase and go straight to Posted for automated entries
    // For now use the entryId as the entryNumber placeholder if we don't have a sequence
    const entryNumber = `JE-CASH-${entryId.slice(0, 8)}`;

    // Note: We are interacting directly with Prisma here to bypass complex UseCase overrides/validation
    // that might not be available in Worker.

    await this.prisma.journalEntry.create({
      data: {
        tenantId: event.tenantId,
        entryNumber,
        status: "Posted",
        postingDate: businessDate ? new Date(businessDate) : new Date(),
        memo: `Cash ${type} - ${sourceType}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceType: "CashEntry" as any,
        sourceId: entryId,
        createdBy: "system",
        postedBy: "system",
        postedAt: new Date(),
        lines: {
          create: [
            {
              tenantId: event.tenantId,
              ledgerAccountId: debitAccountId,
              direction: "Debit",
              amountCents: Math.abs(amountCents),
              currency: "EUR",
            },
            {
              tenantId: event.tenantId,
              ledgerAccountId: creditAccountId,
              direction: "Credit",
              amountCents: Math.abs(amountCents),
              currency: "EUR",
            },
          ],
        },
      },
    });

    this.logger.log(`Journal Entry created for Cash Entry ${entryId}`);
  }
}
