import React from "react";
import {
  ExpensesPage,
  NewExpensePage,
  ExpenseDetailPage,
} from "@corely/web-features/modules/expenses";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

export const expensesRoutes = (): FeatureRoute[] => [
  { path: "/expenses", element: <ExpensesPage /> },
  { path: "/expenses/new", element: <NewExpensePage /> },
  { path: "/expenses/:id", element: <ExpenseDetailPage /> },
  { path: "/expenses/:id/edit", element: <NewExpensePage /> },
];

export const expensesNavItems: FeatureNavItem[] = [
  { id: "expenses", label: "Expenses", route: "/expenses", icon: "Receipt" },
];
