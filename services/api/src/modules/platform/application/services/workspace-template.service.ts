import { Injectable } from "@nestjs/common";
import type {
  WorkspaceCapabilities,
  WorkspaceDashboardWidget,
  WorkspaceTerminology,
} from "@corely/contracts";

@Injectable()
export class WorkspaceTemplateService {
  getDefaultCapabilities(): WorkspaceCapabilities {
    return {
      // Collaboration
      "workspace.multiUser": true,
      "workspace.rbac": true,
      approvals: true,

      // Sales
      "invoices.advanced": true,
      "sales.quotes": true,
      "sales.projects": true,
      "time.tracking": true,

      // Purchasing
      "purchasing.purchaseOrders": true,
      "purchasing.supplierPortal": false, // Can be enabled separately

      // Inventory
      "inventory.basic": true,
      "catalog.basic": true,
      "inventory.warehouses": false, // Can be enabled separately
      "inventory.serialTracking": false, // Can be enabled separately
      "import.basic": true,

      // Finance
      "finance.costCenters": true,
      "finance.budgeting": true,
      "finance.multiCurrency": false, // Can be enabled separately

      // Tax
      "tax.vatReporting": true,
      "tax.profiles": true,

      // CRM
      "crm.advanced": true,
      "marketing.basic": false, // Can be enabled separately

      // Booking
      "booking.basic": true,
      "booking.advanced": false,

      // POS: Optional
      "pos.basic": false,
      "pos.multiRegister": false,

      // Platform
      "ai.copilot": true,
      "platform.apiAccess": true,
      "platform.webhooks": true,
      "platform.customFields": true,
    };
  }

  getDefaultTerminology(): WorkspaceTerminology {
    return {
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
    };
  }

  getDefaultHomeWidgets(): WorkspaceDashboardWidget[] {
    return [
      {
        id: "quick-actions",
        titleKey: "dashboard.quickActions",
        defaultTitle: "Quick Actions",
        widgetType: "quick-actions",
        order: 1,
        size: "full",
        config: {
          actions: [
            {
              id: "create-invoice",
              labelKey: "actions.createInvoice",
              icon: "FileText",
              route: "/invoices/new",
            },
            {
              id: "add-expense",
              labelKey: "actions.addExpense",
              icon: "Receipt",
              route: "/expenses/new",
            },
            {
              id: "add-customer",
              labelKey: "customers.addCustomer",
              icon: "Users",
              route: "/customers/new",
            },
          ],
        },
      },
      {
        id: "recent-invoices",
        titleKey: "dashboard.recentInvoices",
        defaultTitle: "Recent Invoices",
        widgetType: "recent-invoices",
        order: 2,
        size: "medium",
        config: { limit: 5 },
      },
      {
        id: "pending-expenses",
        titleKey: "dashboard.pendingExpenses",
        defaultTitle: "Pending Expenses",
        widgetType: "pending-expenses",
        order: 3,
        size: "medium",
        config: { limit: 5 },
      },
      {
        id: "ai-assistant",
        titleKey: "dashboard.aiAssistant",
        defaultTitle: "AI Assistant",
        widgetType: "ai-copilot",
        order: 4,
        size: "large",
      },
    ];
  }

  getDefaultEnabledApps(): string[] {
    return [
      "core",
      "pos-admin",
      "platform",
      "workspaces",
      "directory",
      "booking",
      "invoices",
      "expenses",
      "parties",
      "forms",
      "tax",
      "portfolio",
      "website",
      "cms",
      "ai-copilot",
      "classes",
    ];
  }
}
