import React from "react";
import { RequirePermission } from "@corely/web-shared/shared/permissions";
import {
  CashEntriesScreen,
  CashExportsScreen,
  CashRegisterDetailScreen,
  CashRegisterEditScreen,
  CashRegisterNewScreen,
  CashRegistersScreen,
  DailyCloseScreen,
} from "../modules/cash-management";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

const withPermission = (permission: string, element: React.ReactElement): React.ReactElement => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

export const cashManagementRoutes = (): FeatureRoute[] => [
  { path: "/cash/registers", element: <CashRegistersScreen /> },
  { path: "/cash/registers/new", element: withPermission("cash.write", <CashRegisterNewScreen />) },
  { path: "/cash/registers/:id", element: <CashRegisterDetailScreen /> },
  {
    path: "/cash/registers/:id/edit",
    element: withPermission("cash.write", <CashRegisterEditScreen />),
  },
  {
    path: "/cash/registers/:id/entries",
    element: withPermission("cash.write", <CashEntriesScreen />),
  },
  {
    path: "/cash/registers/:id/day-close",
    element: withPermission("cash.close", <DailyCloseScreen />),
  },
  {
    path: "/cash/registers/:id/exports",
    element: withPermission("cash.export", <CashExportsScreen />),
  },
];

export const cashManagementNavItems: FeatureNavItem[] = [
  { id: "cash-registers", label: "Registers", route: "/cash/registers", icon: "Coins" },
];
