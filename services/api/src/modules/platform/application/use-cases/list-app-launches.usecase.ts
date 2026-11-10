import { Inject, Injectable } from "@nestjs/common";
import {
  AppDirectoryDestinationSchema,
  type AppCatalogItem,
  type AppLaunchOrigins,
} from "@corely/contracts";
import { APP_LAUNCH_ORIGINS_TOKEN } from "../ports/app-launch-origins.port";
import { ListAppCatalogUseCase } from "./list-app-catalog.usecase";
import { ComposeMenuUseCase, type ComposeMenuInput } from "./compose-menu.usecase";

/** Staff launch projection; keeps the administrative catalog permission unchanged. */
@Injectable()
export class ListAppLaunchesUseCase {
  constructor(
    private readonly catalog: ListAppCatalogUseCase,
    private readonly menus: ComposeMenuUseCase,
    @Inject(APP_LAUNCH_ORIGINS_TOKEN) private readonly origins: AppLaunchOrigins = {}
  ) {}

  async execute(input: ComposeMenuInput): Promise<AppCatalogItem[]> {
    const catalog = await this.catalog.execute(input.tenantId);
    const visible: AppCatalogItem[] = [];
    const enabledApps = new Set(catalog.filter((app) => app.enabled).map((app) => app.appId));
    const legacyMenu = catalog.some((app) => app.directory)
      ? await this.menus.execute({ ...input, launchId: undefined })
      : undefined;
    for (const app of catalog) {
      const entry = app.directory;
      const item = legacyMenu?.groups
        .find((group) => group.appId === app.appId)
        ?.items.find((menuItem) => menuItem.id === entry?.menuId);
      if (
        app.enabled &&
        app.dependencies.every((id) => enabledApps.has(id)) &&
        entry &&
        item?.route &&
        ["platform", "app"].includes(input.surfaceId)
      ) {
        const destination = AppDirectoryDestinationSchema.safeParse({
          origin: this.origins.legacy,
          path: item.route,
        });
        visible.push({
          ...app,
          dependencies: [],
          directory: { ...entry, destination: destination.success ? destination.data : undefined },
        });
        continue;
      }
      if (!app.launch) {
        continue;
      }
      const menu = await this.menus.execute({ ...input, launchId: app.launch.launchId });
      // Existing menu composition applies membership, permissions, capabilities,
      // dependency enablement and entitlements. No browser-side grant inference.
      if (menu.items.length > 0) {
        // Dependency topology belongs to host administration, not staff discovery.
        visible.push({ ...app, directory: undefined, dependencies: [] });
      }
    }
    return visible;
  }
}
