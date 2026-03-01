import type { Command } from "@corely/web-shared/shared/command-palette/types";

export { default as ExpensesPage } from "./screens/ExpensesPage";
export { default as NewExpensePage } from "./screens/NewExpensePage";
export { ExpenseDetailPage } from "./screens/ExpenseDetailPage";

export const commandContributions = (): Command[] => [
  {
    id: "module.expenses.list",
    title: "Expense Center",
    subtitle: "Open all expenses",
    keywords: ["expense", "costs", "spending"],
    group: "Navigate",
    run: ({ navigate }) => navigate("/expenses"),
  },
];
