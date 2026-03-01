import React from "react";
import {
  TaxCenterPage,
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
  { path: "/tax/filings", element: <FilingsListPage /> },
  { path: "/tax/filings/new", element: <CreateFilingPage /> },
  { path: "/tax/filings/:id", element: <FilingDetailPage /> },
  { path: "/tax/payments", element: <TaxPaymentsPage /> },
  { path: "/tax/documents", element: <TaxDocumentsPage /> },
  { path: "/tax/settings", element: <TaxSettingsPage /> },
];

export const taxNavItems: FeatureNavItem[] = [
  { id: "tax", label: "Tax", route: "/tax", icon: "Scale" },
];
