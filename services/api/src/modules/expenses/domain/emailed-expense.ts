import { EMAILED_EXPENSE_PREFIX } from "@corely/contracts";

export { EMAILED_EXPENSE_PREFIX };
export const isEmailedExpense = (id: string) => id.startsWith(EMAILED_EXPENSE_PREFIX);
