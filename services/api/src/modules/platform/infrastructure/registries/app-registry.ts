import { Injectable } from "@nestjs/common";
import type { AppManifest } from "@corely/contracts";
import type { AppRegistryPort } from "../../application/ports/app-registry.port";
import { coreAppManifest } from "../../core.manifest";
import { platformAppManifest } from "../../platform.manifest";
import { invoicesAppManifest } from "../../../invoices/invoices.manifest";
import { crmAppManifest } from "../../../crm/crm.manifest";
import { portfolioAppManifest } from "../../../portfolio/portfolio.manifest";
import { issuesAppManifest } from "../../../issues/issues.manifest";
import { cmsAppManifest } from "../../../cms/cms.manifest";
import { expensesAppManifest } from "../../../expenses/expenses.manifest";
import { partyAppManifest } from "../../../party/party.manifest";
import { aiCopilotAppManifest } from "../../../ai-copilot/ai-copilot.manifest";
import { taxAppManifest } from "../../../tax/tax.manifest";
import { cashManagementAppManifest } from "../../../cash-management/cash-management.manifest";
import { salesAppManifest } from "../../../sales/sales.manifest";
import { workspacesAppManifest } from "../../../workspaces/workspaces.manifest";
import { purchasingAppManifest } from "../../../purchasing/purchasing.manifest";
import { rentalsAppManifest } from "../../../rentals/rentals.manifest";
import { websiteAppManifest } from "../../../website/website.manifest";
import { classesAppManifest } from "../../../classes/classes.manifest";
import { catalogAppManifest } from "../../../catalog/catalog.manifest";
import { importAppManifest } from "../../../import/import.manifest";
import { directoryAppManifest } from "../../../directory/directory.manifest";

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
    // Core apps
    this.register(coreAppManifest);
    this.register(platformAppManifest);

    // Invoices App - imported from module manifest
    this.register(invoicesAppManifest);

    // CRM App
    this.register(crmAppManifest);

    // Portfolio App
    this.register(portfolioAppManifest);

    // Issues App
    this.register(issuesAppManifest);

    // CMS App
    this.register(cmsAppManifest);

    this.register(expensesAppManifest);
    this.register(partyAppManifest);
    this.register(aiCopilotAppManifest);
    this.register(taxAppManifest);
    this.register(cashManagementAppManifest);
    this.register(salesAppManifest);
    this.register(workspacesAppManifest);
    this.register(purchasingAppManifest);
    this.register(rentalsAppManifest);
    this.register(websiteAppManifest);
    this.register(classesAppManifest);
    this.register(catalogAppManifest);
    this.register(importAppManifest);
    this.register(directoryAppManifest);
  }
}
