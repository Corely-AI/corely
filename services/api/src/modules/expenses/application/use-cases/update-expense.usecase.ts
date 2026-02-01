import { NotFoundError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { type PrismaService } from "@corely/data";

export interface UpdateExpenseInput {
  expenseId: string;
  merchantName?: string;
  expenseDate?: Date;
  totalAmountCents?: number;
  currency?: string;
  category?: string | null;
  vatRate?: number | null;
  custom?: Record<string, unknown> | null;
}

export class UpdateExpenseUseCase {
  constructor(
    private readonly repo: ExpenseRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort,
    private readonly prisma: PrismaService
  ) {}

  async execute(input: UpdateExpenseInput, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const expense = await this.repo.findById(tenantId, input.expenseId, { includeArchived: true });
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }

    const totalCents = input.totalAmountCents ?? expense.totalCents;
    const vatRate = input.vatRate;
    const taxAmountCents =
      vatRate != null ? Math.round((totalCents * vatRate) / 100) : expense.taxAmountCents;

    expense.update({
      merchant: input.merchantName,
      totalCents,
      taxAmountCents,
      currency: input.currency ?? expense.currency,
      category: input.category ?? expense.category,
      issuedAt: input.expenseDate ?? expense.issuedAt,
      custom: input.custom ?? expense.custom,
    });

    await this.repo.update(expense);
    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "expense.updated",
      entityType: "Expense",
      entityId: expense.id,
      metadata: {},
    });

    // Sync Tax Snapshot (moved from worker to API)
    if (expense.status === "APPROVED") {
      const tax = expense.taxAmountCents ?? 0;
      const subtotal = expense.totalCents - tax;
      await this.prisma.taxSnapshot.upsert({
        where: {
          tenantId_sourceType_sourceId: {
            tenantId: expense.tenantId,
            sourceType: "EXPENSE",
            sourceId: expense.id,
          },
        },
        update: {
          subtotalAmountCents: subtotal,
          taxTotalAmountCents: tax,
          totalAmountCents: expense.totalCents,
          currency: expense.currency,
          calculatedAt: expense.issuedAt,
        },
        create: {
          tenantId: expense.tenantId,
          sourceType: "EXPENSE",
          sourceId: expense.id,
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: expense.currency,
          calculatedAt: expense.issuedAt,
          subtotalAmountCents: subtotal,
          taxTotalAmountCents: tax,
          totalAmountCents: expense.totalCents,
          breakdownJson: "{}",
          version: 1,
        },
      });
    }

    return expense;
  }
}
