import React from "react";
import { RequirePermission } from "@corely/web-shared/shared/permissions";
import { PosRegisterNewScreen, PosRegistersScreen } from "../modules/pos-registers";
import { PosTransactionDetailScreen, PosTransactionsScreen } from "../modules/pos-transactions";
import type { FeatureRoute } from "@corely/web-features/types";

const withPermission = (permission: string, element: React.ReactElement): React.ReactElement => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

export const posAdminRoutes = (): FeatureRoute[] => [
  {
    path: "/pos/admin/registers",
    element: withPermission("pos.registers.read", <PosRegistersScreen />),
  },
  {
    path: "/pos/admin/registers/new",
    element: withPermission("pos.registers.manage", <PosRegisterNewScreen />),
  },
  {
    path: "/pos/admin/transactions",
    element: withPermission("pos.transactions.read", <PosTransactionsScreen />),
  },
  {
    path: "/pos/admin/transactions/:transactionId",
    element: withPermission("pos.transactions.read", <PosTransactionDetailScreen />),
  },
];
