import { Injectable } from "@nestjs/common";
import type { AppManifest } from "@corely/contracts";
import type { AppRegistryPort } from "../../application/ports/app-registry.port";
import { invoicesAppManifest } from "../../../invoices/invoices.manifest";
import { crmAppManifest } from "../../../crm/crm.manifest";
import { portfolioAppManifest } from "../../../portfolio/portfolio.manifest";

/**
 * App Registry
 * Central registry for all app manifests
 * Manifests are loaded statically from each module
 */
@Injectable()
export class AppRegistry implements AppRegistryPort {
  private manifests = new Map<string, AppManifest>();

  constructor() {
    // TODO: Load manifests from each module
    // For now, this is empty - manifests will be registered via loadManifests()
    // or via a separate initialization
  }

  /**
   * Register an app manifest
   */
  register(manifest: AppManifest): void {
    this.manifests.set(manifest.appId, manifest);
  }

  /**
   * Get app manifest by ID
   */
  get(appId: string): AppManifest | undefined {
    return this.manifests.get(appId);
  }

  /**
   * List all registered apps
   */
  list(): AppManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Find apps that provide a specific capability
   */
  findByCapability(capability: string): AppManifest[] {
    return this.list().filter((manifest) => manifest.capabilities.includes(capability));
  }

  /**
   * Check if an app exists
   */
  has(appId: string): boolean {
    return this.manifests.has(appId);
  }

  /**
   * Load manifests (to be called during module initialization)
   * This method should be extended to import manifests from all modules
   */
  loadManifests(): void {
    // Core Platform App
    this.register({
      appId: "platform",
      name: "Platform",
      tier: 0,
      version: "1.0.0",
      description: "Core platform features",
      dependencies: [],
      capabilities: ["platform.manage"],
      permissions: ["platform.apps.manage"],
      menu: [
        {
          id: "platform-settings",
          scope: "web",
          section: "platform",
          labelKey: "nav.platform",
          defaultLabel: "Platform",
          route: "/settings/platform",
          icon: "Cpu",
          order: 100,
          requiresPermissions: ["platform.apps.manage"],
        },
      ],
    });

    // Dashboard/Core App
    this.register({
      appId: "core",
      name: "Core",
      tier: 0,
      version: "1.0.0",
      description: "Dashboard and core features",
      dependencies: [],
      capabilities: [],
      permissions: [],
      menu: [
        {
          id: "dashboard",
          scope: "web",
          section: "dashboard",
          labelKey: "nav.dashboard",
          defaultLabel: "Dashboard",
          route: "/dashboard",
          icon: "LayoutDashboard",
          order: 1,
        },
      ],
    });

    // Invoices App - imported from module manifest
    this.register(invoicesAppManifest);

    // CRM App
    this.register(crmAppManifest);

    // Portfolio App
    this.register(portfolioAppManifest);

    // Expenses App
    this.register({
      appId: "expenses",
      name: "Expenses",
      tier: 1,
      version: "1.0.0",
      description: "Expense tracking",
      dependencies: [],
      capabilities: [],
      permissions: ["expenses.read", "expenses.write"],
      menu: [
        {
          id: "expenses",
          scope: "web",
          section: "expenses",
          labelKey: "nav.expenses",
          defaultLabel: "Expenses",
          route: "/expenses",
          icon: "Receipt",
          order: 20,
        },
      ],
    });

    // Parties/Clients App
    this.register({
      appId: "parties",
      name: "Clients & Customers",
      tier: 1,
      version: "1.0.0",
      description: "Customer and client management",
      dependencies: [],
      capabilities: [],
      permissions: ["parties.read", "parties.write"],
      menu: [
        {
          id: "clients",
          scope: "web",
          section: "clients",
          labelKey: "nav.clients",
          defaultLabel: "Clients",
          route: "/customers",
          icon: "UsersRound",
          order: 30,
        },
      ],
    });

    // AI Copilot App
    this.register({
      appId: "ai-copilot",
      name: "AI Assistant",
      tier: 2,
      version: "1.0.0",
      description: "AI-powered assistant",
      dependencies: [],
      capabilities: ["ai.copilot"],
      permissions: [],
      menu: [
        {
          id: "assistant",
          scope: "web",
          section: "assistant",
          labelKey: "nav.assistant",
          defaultLabel: "Assistant",
          route: "/assistant",
          icon: "Sparkles",
          order: 40,
        },
      ],
    });

    // Tax App (freelancer + company)
    this.register({
      appId: "tax",
      name: "Tax",
      tier: 2,
      version: "2.0.0",
      description: "Tax Center, Filings, and Compliance",
      dependencies: [],
      capabilities: [],
      permissions: [],
      menu: [
        {
          id: "tax-center",
          scope: "web",
          section: "tax",
          labelKey: "nav.tax.overview",
          defaultLabel: "Overview",
          route: "/tax",
          icon: "LayoutDashboard",
          order: 10,
          exact: true,
        },
        {
          id: "tax-filings",
          scope: "web",
          section: "tax",
          labelKey: "nav.tax.filings",
          defaultLabel: "Filings",
          route: "/tax/filings",
          icon: "Files",
          order: 20,
        },
        {
          id: "tax-payments",
          scope: "web",
          section: "tax",
          labelKey: "nav.tax.payments",
          defaultLabel: "Payments",
          route: "/tax/payments",
          icon: "CreditCard",
          order: 30,
        },
        {
          id: "tax-documents",
          scope: "web",
          section: "tax",
          labelKey: "nav.tax.documents",
          defaultLabel: "Documents",
          route: "/tax/documents",
          icon: "FileText",
          order: 40,
        },
        {
          id: "tax-settings",
          scope: "web",
          section: "tax",
          labelKey: "nav.tax.settings",
          defaultLabel: "Settings",
          route: "/tax/settings",
          icon: "Settings",
          order: 50,
        },
      ],
    });

    // Cash Management App
    this.register({
      appId: "cash-management",
      name: "Cash Management",
      tier: 1,
      version: "1.0.0",
      description: "Cash registers and daily close",
      dependencies: [],
      capabilities: [],
      permissions: ["cash.read", "cash.write"],
      menu: [
        {
          id: "cash-management",
          scope: "web",
          section: "cash",
          labelKey: "nav.cashManagement",
          defaultLabel: "Cash Management",
          route: "/cash-registers",
          icon: "Coins",
          order: 60,
        },
      ],
    });

    // Sales App (quotes, projects - company mode)
    this.register({
      appId: "sales",
      name: "Sales",
      tier: 3,
      version: "1.0.0",
      description: "Sales quotes and projects",
      dependencies: ["parties"],
      capabilities: ["sales.quotes", "sales.projects"],
      permissions: ["sales.read", "sales.write"],
      menu: [
        {
          id: "quotes",
          scope: "web",
          section: "quotes",
          labelKey: "nav.quotes",
          defaultLabel: "Quotes",
          route: "/sales/quotes",
          icon: "FileCheck",
          order: 12,
          requiresCapabilities: ["sales.quotes"],
        },
        {
          id: "projects",
          scope: "web",
          section: "projects",
          labelKey: "nav.projects",
          defaultLabel: "Projects",
          route: "/projects",
          icon: "Briefcase",
          order: 13,
          requiresCapabilities: ["sales.projects"],
        },
      ],
    });

    // Workspace/Identity App
    this.register({
      appId: "workspaces",
      name: "Workspaces",
      tier: 0,
      version: "1.0.0",
      description: "Workspace and profile management",
      dependencies: [],
      capabilities: [],
      permissions: [],
      menu: [
        {
          id: "workspace-settings",
          scope: "web",
          section: "workspace",
          labelKey: "nav.workspace",
          defaultLabel: "Legal & Address",
          route: "/settings/workspace",
          icon: "Building",
          order: 90,
        },
        {
          id: "payment-methods-settings",
          scope: "web",
          section: "workspace",
          labelKey: "nav.paymentMethods",
          defaultLabel: "Payment Methods",
          route: "/settings/payment-methods",
          icon: "CreditCard",
          order: 91,
        },
        {
          id: "profile-settings",
          scope: "web",
          section: "profile",
          labelKey: "nav.profile",
          defaultLabel: "Account & Profile",
          route: "/settings",
          icon: "User",
          order: 95,
        },
        {
          id: "workspace-members",
          scope: "web",
          section: "team",
          labelKey: "nav.members",
          defaultLabel: "Team & Members",
          route: "/settings/members",
          icon: "Users",
          order: 92,
        },
        {
          id: "workspace-roles",
          scope: "web",
          section: "roles",
          labelKey: "nav.roles",
          defaultLabel: "Roles & Permissions",
          route: "/settings/roles",
          icon: "ShieldAlert",
          order: 93,
        },
      ],
    });

    // Add Sales Settings to Sales App
    const salesApp = this.manifests.get("sales");
    if (salesApp) {
      salesApp.menu.push({
        id: "sales-settings",
        scope: "web",
        section: "sales",
        labelKey: "nav.salesSettings",
        defaultLabel: "Sales Settings",
        route: "/sales/settings",
        icon: "Settings2",
        order: 100,
      });
    }

    // Register Purchasing App menu items (if not already done)
    this.register({
      appId: "purchasing",
      name: "Purchasing",
      tier: 3,
      version: "1.0.0",
      description: "Purchasing and supplier management",
      dependencies: [],
      capabilities: ["purchasing.purchaseOrders"],
      permissions: ["purchasing.read", "purchasing.write"],
      menu: [
        {
          id: "purchase-orders",
          scope: "web",
          section: "purchase-orders",
          labelKey: "nav.purchaseOrders",
          defaultLabel: "Purchase Orders",
          route: "/purchasing/purchase-orders",
          icon: "ShoppingBag",
          order: 21,
        },
        {
          id: "purchasing-settings",
          scope: "web",
          section: "purchasing",
          labelKey: "nav.purchasingSettings",
          defaultLabel: "Purchasing Settings",
          route: "/purchasing/settings",
          icon: "SlidersHorizontal",
          order: 100,
        },
      ],
    });

    // Rentals App
    this.register({
      appId: "rentals",
      name: "Vacation Rentals",
      tier: 2,
      version: "1.0.0",
      description: "Manage vacation home rentals and availability",
      dependencies: [],
      capabilities: ["rentals.manage"],
      permissions: ["rentals.read", "rentals.write"],
      menu: [
        {
          id: "rental-properties",
          scope: "web",
          section: "rentals",
          labelKey: "nav.rentals.properties",
          defaultLabel: "Vacation Rentals",
          route: "/rentals/properties",
          icon: "Home",
          order: 25,
        },
      ],
    });
  }
}
