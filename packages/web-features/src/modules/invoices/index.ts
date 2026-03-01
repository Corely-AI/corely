import type { Command } from "@corely/web-shared/shared/command-palette/types";

export { default as InvoicesPage } from "./screens/InvoicesPage";
export { default as NewInvoicePage } from "./screens/NewInvoicePage";
export { default as InvoiceDetailPage } from "./screens/InvoiceDetailPage";

export const commandContributions = (): Command[] => [
  {
    id: "module.invoices.sales.list",
    title: "Sales Invoices",
    subtitle: "Open capability-based sales invoices",
    keywords: ["sales", "billing", "invoice"],
    group: "Navigate",
    run: ({ navigate }) => navigate("/sales/invoices"),
  },
];
