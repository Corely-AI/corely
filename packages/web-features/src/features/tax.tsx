import React from "react";
import {
  IncomeStatementChildPage,
  IncomeStatementPayslipPage,
  TaxCenterPage,
  TaxEurReportPage,
  TaxAnnualAssistantPage,
  FilingsListPage,
  FilingDetailPage,
  CreateFilingPage,
  TaxPaymentsPage,
  TaxDocumentsPage,
  TaxSettingsPage,
} from "@corely/web-features/modules/tax";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

export const taxRoutes = (): FeatureRoute[] => [
  { path: "/tax", element: <TaxCenterPage /> },
  { path: "/tax/reports/eur", element: <TaxEurReportPage /> },
  { path: "/tax/annual", element: <TaxAnnualAssistantPage /> },
  { path: "/tax/annual/:year", element: <TaxAnnualAssistantPage /> },
  { path: "/tax/annual/t/:threadId", element: <TaxAnnualAssistantPage /> },
  { path: "/tax/annual/:year/t/:threadId", element: <TaxAnnualAssistantPage /> },
  { path: "/tax/filings", element: <FilingsListPage /> },
  { path: "/tax/filings/new", element: <CreateFilingPage /> },
  { path: "/tax/filings/:id", element: <FilingDetailPage /> },
  { path: "/tax/payments", element: <TaxPaymentsPage /> },
  { path: "/tax/documents", element: <TaxDocumentsPage /> },
  { path: "/tax/settings", element: <TaxSettingsPage /> },
  {
    path: "/income-statement/payslip/:year/:partner",
    element: <IncomeStatementPayslipPage />,
  },
  {
    path: "/income-statement/child/:year",
    element: <IncomeStatementChildPage />,
  },
];

export const taxNavItems: FeatureNavItem[] = [
  { id: "tax", label: "Tax", route: "/tax", icon: "Scale" },
  {
    id: "tax-annual-assistant",
    label: "Annual assistant",
    route: "/tax/annual",
    icon: "MessageSquare",
  },
  { id: "tax-reports", label: "Reports", route: "/tax/reports/eur", icon: "BarChart3" },
];
