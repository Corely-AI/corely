import { type TransactionContext } from "@corely/kernel";
import { type Expense } from "../../domain/expense.entity";

export interface ExpenseListFilters {
  q?: string;
  merchantName?: string | null;
  category?: string | null;
  fromDate?: Date;
  toDate?: Date;
  includeArchived?: boolean;
}

export interface ExpenseListResult {
  items: Expense[];
  total: number;
  nextCursor?: string | null;
}

export interface ExpenseRepositoryPort {
  create(expense: Expense, tx?: TransactionContext): Promise<void>;
  update(expense: Expense, tx?: TransactionContext): Promise<void>;
  findById(
    tenantId: string,
    id: string,
    opts?: { includeArchived?: boolean },
    tx?: TransactionContext
  ): Promise<Expense | null>;
  list(
    tenantId: string,
    filters: ExpenseListFilters,
    pagination: { page: number; pageSize: number; cursor?: string | null },
    tx?: TransactionContext
  ): Promise<ExpenseListResult>;
}

export const EXPENSE_REPOSITORY = "expenses/expense-repository";
