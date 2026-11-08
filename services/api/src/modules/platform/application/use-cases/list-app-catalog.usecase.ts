import { Inject, Injectable } from "@nestjs/common";
import {
  buildAppLaunchUrl,
  type AppCatalogItem,
  type AppCatalogLaunch,
  type AppLaunchOrigins,
  type AppManifest,
} from "@corely/contracts";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";
import { APP_LAUNCH_ORIGINS_TOKEN } from "../ports/app-launch-origins.port";

@Injectable()
export class ListAppCatalogUseCase {
  constructor(
    @Inject(APP_REGISTRY_TOKEN) private readonly registry: AppRegistryPort,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly installs: TenantAppInstallRepositoryPort,
    @Inject(APP_LAUNCH_ORIGINS_TOKEN) private readonly origins: AppLaunchOrigins
  ) {}

  async execute(tenantId: string | null): Promise<AppCatalogItem[]> {
    const installs = tenantId ? await this.installs.listByTenant(tenantId) : [];
    const enabled = new Set(installs.filter((app) => app.enabled).map((app) => app.appId));
    return this.registry.list().map((app) => ({
      // Preserve the legacy tenant-less response for existing administration clients.
      ...(!tenantId ? app : {}),
      appId: app.appId,
      name: app.name,
      tier: app.tier,
      version: app.version,
      description: app.description,
      dependencies: app.dependencies,
      enabled: enabled.has(app.appId),
      ...(app.launch ? { launch: this.projectLaunch(app, enabled.has(app.appId)) } : {}),
    }));
  }

  private projectLaunch(app: AppManifest, enabled: boolean): AppCatalogLaunch | undefined {
    const launch = app.launch;
    if (!launch) {
      return undefined;
    }
    if (launch.availability === "coming-soon") {
      return { ...launch, availability: "coming-soon" };
    }
    if (!enabled) {
      return { ...launch, availability: "app-disabled" };
    }
    const url = buildAppLaunchUrl(launch.launchId, this.origins);
    return url
      ? { ...launch, availability: "available", url }
      : { ...launch, availability: "unconfigured" };
  }
}
