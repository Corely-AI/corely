import { Injectable } from "@nestjs/common";
import type { AppCatalogItem } from "@corely/contracts";
import { ListAppCatalogUseCase } from "./list-app-catalog.usecase";
import { ComposeMenuUseCase, type ComposeMenuInput } from "./compose-menu.usecase";

/** Staff launch projection; keeps the administrative catalog permission unchanged. */
@Injectable()
export class ListAppLaunchesUseCase {
  constructor(
    private readonly catalog: ListAppCatalogUseCase,
    private readonly menus: ComposeMenuUseCase
  ) {}

  async execute(input: ComposeMenuInput): Promise<AppCatalogItem[]> {
    const catalog = await this.catalog.execute(input.tenantId);
    const visible: AppCatalogItem[] = [];
    for (const app of catalog) {
      if (!app.launch) {
        continue;
      }
      const menu = await this.menus.execute({ ...input, launchId: app.launch.launchId });
      // Existing menu composition applies membership, permissions, capabilities,
      // dependency enablement and entitlements. No browser-side grant inference.
      if (menu.items.length > 0) {
        // Dependency topology belongs to host administration, not staff discovery.
        visible.push({ ...app, dependencies: [] });
      }
    }
    return visible;
  }
}
