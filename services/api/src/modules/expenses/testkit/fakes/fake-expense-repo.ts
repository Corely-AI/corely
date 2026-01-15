import {
  type ExpenseListFilters,
  type ExpenseRepositoryPort,
} from "../../application/ports/expense-repository.port";
import { type Expense } from "../../domain/expense.entity";

export class FakeExpenseRepository implements ExpenseRepositoryPort {
  public expenses: Expense[] = [];

  async create(expense: Expense): Promise<void> {
    this.expenses.push(expense);
  }

  async update(expense: Expense): Promise<void> {
    const existingIndex = this.expenses.findIndex((e) => e.id === expense.id);
    if (existingIndex >= 0) {
      this.expenses[existingIndex] = expense;
    } else {
      this.expenses.push(expense);
    }
  }

  async findById(
    tenantId: string,
    id: string,
    opts?: { includeArchived?: boolean }
  ): Promise<Expense | null> {
    return (
      this.expenses.find(
        (e) =>
          e.id === id && e.tenantId === tenantId && (opts?.includeArchived ? true : !e.archivedAt)
      ) ?? null
    );
  }

  async list(
    tenantId: string,
    filters: ExpenseListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<{ items: Expense[]; total: number; nextCursor?: string | null }> {
    const filtered = this.expenses.filter(
      (e) =>
        e.tenantId === tenantId &&
        (filters.includeArchived ? true : !e.archivedAt) &&
        (!filters.q ||
          e.merchant.toLowerCase().includes(filters.q.toLowerCase()) ||
          (e.category ?? "").toLowerCase().includes(filters.q.toLowerCase())) &&
        (!filters.category || e.category === filters.category)
    );
    const start = (pagination.page - 1) * pagination.pageSize;
    const items = filtered.slice(start, start + pagination.pageSize);
    const total = filtered.length;
    const nextCursor =
      start + pagination.pageSize < total ? (items[items.length - 1]?.id ?? null) : null;
    return { items, total, nextCursor };
  }
}
