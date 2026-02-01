import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  type ExpenseListFilters,
  type ExpenseListResult,
  type ExpenseRepositoryPort,
} from "../../application/ports/expense-repository.port";
import { Expense } from "../../domain/expense.entity";

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(expense: Expense, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.expense.create({
      data: {
        id: expense.id,
        tenantId: expense.tenantId,
        status: expense.status,
        merchantName: expense.merchant,
        expenseDate: expense.issuedAt,
        totalAmountCents: expense.totalCents,
        taxAmountCents: expense.taxAmountCents ?? undefined,
        currency: expense.currency,
        category: expense.category ?? undefined,
        archivedAt: expense.archivedAt ?? undefined,
        archivedByUserId: expense.archivedByUserId ?? undefined,
        createdByUserId: expense.createdByUserId ?? undefined,
        custom: expense.custom as any,
      } as any,
    });
  }

  async update(expense: Expense, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.expense.update({
      where: { id: expense.id },
      data: {
        status: expense.status,
        merchantName: expense.merchant,
        expenseDate: expense.issuedAt,
        totalAmountCents: expense.totalCents,
        taxAmountCents: expense.taxAmountCents ?? undefined,
        currency: expense.currency,
        category: expense.category ?? undefined,
        archivedAt: expense.archivedAt ?? undefined,
        archivedByUserId: expense.archivedByUserId ?? undefined,
        custom: expense.custom as any,
      },
    });
  }

  async findById(
    tenantId: string,
    id: string,
    opts?: { includeArchived?: boolean },
    tx?: TransactionContext
  ): Promise<Expense | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const data = await client.expense.findFirst({
      where: { id, tenantId, archivedAt: opts?.includeArchived ? undefined : null },
    });
    return data ? this.mapExpense(data) : null;
  }

  async list(
    tenantId: string,
    filters: ExpenseListFilters,
    pagination: { page: number; pageSize: number; cursor?: string | null },
    tx?: TransactionContext
  ): Promise<ExpenseListResult> {
    const client = getPrismaClient(this.prisma, tx as any);
    const where: any = {
      tenantId,
      archivedAt: filters.includeArchived ? undefined : null,
    };
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }
    if (filters.q) {
      where.OR = [
        { merchantName: { contains: filters.q, mode: "insensitive" } },
        { category: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.merchantName) {
      where.merchantName = { contains: filters.merchantName, mode: "insensitive" };
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.fromDate || filters.toDate) {
      where.expenseDate = {};
      if (filters.fromDate) {
        where.expenseDate.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.expenseDate.lte = filters.toDate;
      }
    }

    // Structured filters placeholder
    if (filters.structuredFilters && Array.isArray(filters.structuredFilters)) {
      for (const f of filters.structuredFilters) {
        if (f.field === "status" && f.operator === "in" && Array.isArray(f.value)) {
          where.status = { in: f.value };
        }
      }
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const take = pagination.pageSize;

    // Sort mapping
    let orderBy: any[] = [{ expenseDate: "desc" }, { createdAt: "desc" }];
    if (filters.sort) {
      const [field, dir] = filters.sort.split(":");
      const direction = dir === "asc" ? "asc" : "desc";
      const map: Record<string, string> = {
        issuedAt: "expenseDate",
        expenseDate: "expenseDate",
        totalCents: "totalAmountCents",
        merchant: "merchantName",
        category: "category",
        status: "status",
        createdAt: "createdAt",
      };
      if (map[field]) {
        orderBy = [{ [map[field]]: direction }];
        // Secondary sort to ensure determinstic pagination
        if (field !== "createdAt") {
          orderBy.push({ createdAt: "desc" });
        }
      }
    }

    const [rows, total] = await Promise.all([
      client.expense.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      client.expense.count({ where }),
    ]);

    const nextCursor =
      rows.length === pagination.pageSize && skip + rows.length < total
        ? (rows[rows.length - 1]?.id ?? null)
        : null;

    return {
      items: rows.map((row) => this.mapExpense(row)),
      total,
      nextCursor,
    };
  }

  private mapExpense(data: any): Expense {
    return new Expense(
      data.id,
      data.tenantId,
      data.status,
      data.merchantName ?? "",
      data.totalAmountCents,
      data.taxAmountCents ?? null,
      data.currency,
      data.category ?? null,
      new Date(data.expenseDate),
      data.createdByUserId ?? "",
      new Date(data.createdAt),
      data.archivedAt ? new Date(data.archivedAt) : null,
      data.archivedByUserId ?? null,
      data.custom as any
    );
  }
}
