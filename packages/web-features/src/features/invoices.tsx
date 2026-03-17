import React from "react";
import {
  InvoicesPage,
  NewInvoicePage,
  InvoiceDetailPage,
  InvoiceAuditPage,
} from "@corely/web-features/modules/invoices";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

export const invoicesRoutes = (): FeatureRoute[] => [
  { path: "/invoices", element: <InvoicesPage /> },
  { path: "/invoices/new", element: <NewInvoicePage /> },
  { path: "/invoices/:id", element: <InvoiceDetailPage /> },
  { path: "/invoices/:id/edit", element: <InvoiceDetailPage /> },
  { path: "/audit", element: <InvoiceAuditPage /> },
];

export const invoicesNavItems: FeatureNavItem[] = [
  { id: "invoices", label: "Invoices", route: "/invoices", icon: "FileText" },
];
