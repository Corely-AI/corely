import {
  WorkspaceCapabilitiesSchema,
  type AppLaunchId,
  type WorkspaceConfig,
} from "@corely/contracts";
export function shellConfig(app: AppLaunchId): WorkspaceConfig {
  const invoice = app === "invoice";
  return {
    launchId: app,
    workspaceId: "synthetic-workspace",
    surfaceId: "platform",
    kind: "COMPANY",
    capabilities: WorkspaceCapabilitiesSchema.parse(
      Object.fromEntries(Object.keys(WorkspaceCapabilitiesSchema.shape).map((key) => [key, true]))
    ),
    terminology: {
      partyLabel: "Customer",
      partyLabelPlural: "Customers",
      invoiceLabel: "Invoice",
      invoiceLabelPlural: "Invoices",
      quoteLabel: "Quote",
      quoteLabelPlural: "Quotes",
      projectLabel: "Project",
      projectLabelPlural: "Projects",
      expenseLabel: "Expense",
      expenseLabelPlural: "Expenses",
    },
    navigation: {
      groups: [
        {
          id: invoice ? "invoices" : "people",
          labelKey: "",
          defaultLabel: invoice ? "Invoice" : "Team",
          order: 1,
          items: [
            {
              id: invoice ? "invoices" : "people-directory",
              label: invoice ? "Invoices" : "Staff directory",
              route: invoice ? "/invoices" : "/people/staff",
              icon: invoice ? "FileText" : "Users",
              section: invoice ? "finance" : "team",
              order: 1,
            },
          ],
        },
      ],
    },
    home: { widgets: [] },
    currentUser: { membershipRole: "ADMIN", isWorkspaceAdmin: true },
    computedAt: "2026-11-09T12:00:00Z",
  };
}
