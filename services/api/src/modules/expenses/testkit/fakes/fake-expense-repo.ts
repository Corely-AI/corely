import { ExpenseRepositoryPort } from "../../application/ports/ExpenseRepositoryPort";
import { Expense } from "../../domain/entities/Expense";

export class FakeExpenseRepository implements ExpenseRepositoryPort {
  public expenses: Expense[] = [];

  async save(expense: Expense): Promise<void> {
    const existingIndex = this.expenses.findIndex((e) => e.id === expense.id);
    if (existingIndex >= 0) {
      this.expenses[existingIndex] = expense;
    } else {
      this.expenses.push(expense);
    }
  }

  async findById(id: string): Promise<Expense | null> {
    return this.expenses.find((e) => e.id === id) ?? null;
  }
}
