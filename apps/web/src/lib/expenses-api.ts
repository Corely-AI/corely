/**
 * Expenses API Client
 * Minimal wrapper around expenses endpoints
 */

import type { ExpenseCapabilities, ExpenseDto, CreateExpenseWebInput } from "@corely/contracts";
import { apiClient } from "./api-client";

export type ListExpensesParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  includeArchived?: boolean;
};

export type ListExpensesResponse = {
  items: ExpenseDto[];
  pageInfo?: { page: number; pageSize: number; total: number; hasNextPage: boolean };
  nextCursor?: string | null;
};

export class ExpensesApi {
  async listExpenses(params: ListExpensesParams = {}): Promise<ListExpensesResponse> {
    const query = new URLSearchParams();
    if (params.q) {
      query.set("q", params.q);
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.pageSize) {
      query.set("pageSize", String(params.pageSize));
    }
    if (params.sort) {
      query.set("sort", params.sort);
    }
    if (params.category) {
      query.set("category", params.category);
    }
    if (params.fromDate) {
      query.set("fromDate", params.fromDate);
    }
    if (params.toDate) {
      query.set("toDate", params.toDate);
    }
    if (params.includeArchived !== undefined) {
      query.set("includeArchived", String(params.includeArchived));
    }

    const endpoint = query.toString() ? `/expenses?${query.toString()}` : "/expenses";
    const result = await apiClient.get<{
      items?: ExpenseDto[];
      expenses?: ExpenseDto[];
      pageInfo?: ListExpensesResponse["pageInfo"];
      nextCursor?: string | null;
    }>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });

    return {
      items: result.items ?? result.expenses ?? [],
      pageInfo: result.pageInfo,
      nextCursor: result.nextCursor,
    };
  }

  async createExpense(input: CreateExpenseWebInput): Promise<ExpenseDto> {
    const result = await apiClient.post<{ expense: ExpenseDto }>("/expenses", input, {
      idempotencyKey: input.idempotencyKey ?? apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.expense;
  }

  async getExpense(
    id: string
  ): Promise<{ expense: ExpenseDto; capabilities?: ExpenseCapabilities }> {
    const result = await apiClient.get<{ expense: ExpenseDto; capabilities?: ExpenseCapabilities }>(
      `/expenses/${id}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result;
  }

  async updateExpense(id: string, input: CreateExpenseWebInput): Promise<ExpenseDto> {
    const result = await apiClient.patch<{ expense: ExpenseDto }>(`/expenses/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.expense;
  }

  async deleteExpense(id: string): Promise<void> {
    await apiClient.delete<void>(`/expenses/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async archiveExpense(id: string): Promise<void> {
    await apiClient.post(
      `/expenses/${id}/archive`,
      {},
      { correlationId: apiClient.generateCorrelationId() }
    );
  }
}

export const expensesApi = new ExpensesApi();
