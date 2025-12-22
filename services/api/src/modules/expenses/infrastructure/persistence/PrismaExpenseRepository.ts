import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { Expense } from "../../domain/entities/Expense";
import { ExpenseRepositoryPort } from "../../application/ports/ExpenseRepositoryPort";

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  async save(expense: Expense): Promise<void> {
    await prisma.expense.create({
      data: {
        id: expense.id,
        tenantId: expense.tenantId,
        merchantName: expense.merchant,
        expenseDate: expense.issuedAt,
        totalAmountCents: expense.totalCents,
        currency: expense.currency,
        category: expense.category,
        custom: expense.custom as any,
      },
    });
  }

  async findById(id: string): Promise<Expense | null> {
    const data = await prisma.expense.findUnique({ where: { id } });
    if (!data) return null;
    return new Expense(
      data.id,
      data.tenantId,
      (data as any).merchantName ?? "",
      data.totalAmountCents,
      data.currency,
      data.category,
      data.expenseDate,
      (data as any).createdByUserId ?? "",
      data.createdAt,
      data.custom as any
    );
  }
}
