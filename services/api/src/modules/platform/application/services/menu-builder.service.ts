import { Inject, Injectable } from "@nestjs/common";
import type { MenuContribution, MenuGroup, MenuItem, MenuOverrides } from "@corely/contracts";
import { TenantEntitlementService } from "./tenant-entitlement.service";
import { TenantEntitlement } from "../../domain/entitlement.aggregate";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import {
  TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN,
  type MenuScope,
  type TenantMenuOverrideRepositoryPort,
} from "../ports/tenant-menu-override-repository.port";

export interface BuildMenuInput {
  tenantId: string;
  userId: string;
  permissions: Set<string>;
  scope: "web" | "pos";
  capabilityFilter?: Set<string>;
  capabilityKeys?: Set<string>;
}

export interface BuildMenuOutput {
  items: MenuItem[];
  groups: MenuGroup[];
}

interface ManifestContributionGroup {
  appId: string;
  appName: string;
  tier: number;
  icon?: string;
  contributions: MenuContribution[];
}

interface ResolvedMenuItem {
  item: MenuItem;
  isSettings: boolean;
  sortLabel: string;
}

/**
 * Menu Builder Service
 * Builds app-grouped and flat menu outputs from app manifests.
 */
@Injectable()
export class MenuBuilderService {
  constructor(
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort,
    private readonly entitlementService: TenantEntitlementService,
    @Inject(TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN)
    private readonly menuOverrideRepo: TenantMenuOverrideRepositoryPort
  ) {}

  async build(input: BuildMenuInput): Promise<BuildMenuOutput> {
    const entitlement = await this.entitlementService.getTenantEntitlement(input.tenantId);
    const contributionsByApp: ManifestContributionGroup[] = [];

    for (const appId of entitlement.getEnabledApps()) {
      const manifest = this.appRegistry.get(appId);
      if (!manifest) {
        continue;
      }

      const contributions = manifest.menu.filter((item) =>
        this.shouldIncludeMenuItem(
          item,
          input.scope,
          input.permissions,
          entitlement,
          input.capabilityFilter,
          input.capabilityKeys
        )
      );

      if (contributions.length === 0) {
        continue;
      }

      contributionsByApp.push({
        appId: manifest.appId,
        appName: manifest.name,
        tier: manifest.tier,
        icon: contributions[0]?.icon,
        contributions,
      });
    }

    const scope: MenuScope = input.scope === "web" ? "WEB" : "POS";
    const override = await this.menuOverrideRepo.findByTenantAndScope(input.tenantId, scope);
    const overrides = this.parseOverrides(override?.overridesJson);

    const groups = contributionsByApp
      .map((group) => {
        const items = this.resolveItems(group.contributions, overrides);
        if (items.length === 0) {
          return null;
        }

        return {
          appId: group.appId,
          appName: group.appName,
          tier: group.tier,
          icon: group.icon,
          items,
        };
      })
      .filter((group): group is NonNullable<typeof group> => group !== null)
      .sort((a, b) =>
        this.compareGroupOrder(a.tier, a.appName, a.appId, b.tier, b.appName, b.appId)
      )
      .map((group) => ({
        appId: group.appId,
        defaultLabel: group.appName,
        icon: group.icon,
        items: group.items,
      }));

    return {
      groups,
      items: groups.flatMap((group) => group.items),
    };
  }

  private parseOverrides(raw: string | undefined): MenuOverrides | null {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as MenuOverrides;
    } catch {
      return null;
    }
  }

  private shouldIncludeMenuItem(
    item: MenuContribution,
    scope: string,
    permissions: Set<string>,
    entitlement: TenantEntitlement,
    capabilityFilter?: Set<string>,
    capabilityKeys?: Set<string>
  ): boolean {
    if (!this.matchesScope(item, scope)) {
      return false;
    }

    if (item.requiresApps) {
      for (const requiredApp of item.requiresApps) {
        if (!entitlement.isAppEnabled(requiredApp)) {
          return false;
        }
      }
    }

    if (item.requiresCapabilities) {
      for (const requiredCapability of item.requiresCapabilities) {
        if (!entitlement.hasCapability(requiredCapability)) {
          return false;
        }
        if (
          capabilityKeys &&
          capabilityKeys.has(requiredCapability) &&
          capabilityFilter &&
          !capabilityFilter.has(requiredCapability)
        ) {
          return false;
        }
      }
    }

    if (item.requiresPermissions) {
      for (const requiredPermission of item.requiresPermissions) {
        if (!permissions.has(requiredPermission)) {
          return false;
        }
      }
    }

    return true;
  }

  private matchesScope(item: MenuContribution, scope: string): boolean {
    return item.scope === scope || item.scope === "both";
  }

  private resolveItems(
    contributions: MenuContribution[],
    overrides: MenuOverrides | null
  ): MenuItem[] {
    const hidden = new Set(overrides?.hidden ?? []);
    const resolved: ResolvedMenuItem[] = contributions
      .filter((item) => !hidden.has(item.id))
      .map((item) => {
        const label = overrides?.renames?.[item.id] || item.defaultLabel;
        const order = overrides?.order?.[item.id] ?? item.order ?? 0;
        const resolvedItem: MenuItem = {
          id: item.id,
          section: item.section,
          label,
          labelKey: item.labelKey,
          route: item.route,
          screen: item.screen,
          icon: item.icon,
          order,
          pinned: overrides?.pins?.includes(item.id),
          tags: item.tags,
          requiredCapabilities: item.requiresCapabilities,
          exact: item.exact,
        };
        return {
          item: resolvedItem,
          isSettings: this.isSettingsItem(item),
          sortLabel: (label || item.labelKey || item.id).toLowerCase(),
        };
      });

    resolved.sort((a, b) => {
      if (a.isSettings !== b.isSettings) {
        return a.isSettings ? 1 : -1;
      }
      if (a.item.order !== b.item.order) {
        return a.item.order - b.item.order;
      }
      const labelDiff = a.sortLabel.localeCompare(b.sortLabel);
      if (labelDiff !== 0) {
        return labelDiff;
      }
      return a.item.id.localeCompare(b.item.id);
    });

    return resolved.map((entry) => entry.item);
  }

  private isSettingsItem(item: MenuContribution): boolean {
    const route = item.route ?? "";
    const id = item.id.toLowerCase();
    const section = item.section.toLowerCase();

    return (
      route.startsWith("/settings") ||
      route.includes("/settings/") ||
      route.endsWith("/settings") ||
      id.endsWith("-settings") ||
      section === "settings"
    );
  }

  private compareGroupOrder(
    tierA: number,
    nameA: string,
    appIdA: string,
    tierB: number,
    nameB: string,
    appIdB: string
  ) {
    if (tierA !== tierB) {
      return tierA - tierB;
    }
    const nameDiff = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    if (nameDiff !== 0) {
      return nameDiff;
    }
    return appIdA.localeCompare(appIdB, undefined, { sensitivity: "base" });
  }
}
