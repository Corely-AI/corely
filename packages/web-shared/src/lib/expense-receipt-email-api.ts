import type {
  ExpenseReceiptDraft,
  ExpenseReceiptDraftFields,
  ExpenseReceiptEmailSettings,
  ListExpenseReceiptDrafts,
} from "@corely/contracts";
import { apiClient } from "./api-client";

const base = "/expense-receipts";
const draft = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const expenseReceiptEmailApi = {
  settings: () => apiClient.get<ExpenseReceiptEmailSettings>(`${base}/settings`),
  enable: (enabled: boolean) =>
    apiClient.patch<ExpenseReceiptEmailSettings>(`${base}/settings`, { enabled }),
  makePersonal: () =>
    apiClient.post<ExpenseReceiptEmailSettings>(`${base}/settings/personal-address`, {}),
  list: (after?: string) =>
    apiClient.get<ListExpenseReceiptDrafts>(
      after ? `${base}?after=${encodeURIComponent(after)}` : base
    ),
  get: (id: string) => apiClient.get<ExpenseReceiptDraft>(draft(id)),
  original: (id: string) => apiClient.get<{ url: string }>(`${draft(id)}/original`),
  assign: (id: string, userId: string) =>
    apiClient.post<ExpenseReceiptDraft>(`${draft(id)}/assignment`, { userId }),
  update: (id: string, fields: ExpenseReceiptDraftFields, submit: boolean) =>
    apiClient.patch<ExpenseReceiptDraft>(draft(id), { ...fields, submit }),
};
