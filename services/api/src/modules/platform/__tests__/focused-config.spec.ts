import { describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { WorkspaceConfigSchema } from "@corely/contracts";
import { AppRegistry } from "../infrastructure/registries/app-registry";
import { TenantEntitlement } from "../domain/entitlement.aggregate";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { WorkspaceTemplateService } from "../application/services/workspace-template.service";
import { WorkspaceExperienceResolverService } from "../application/services/workspace-experience-resolver.service";
import { MenuBuilderService } from "../application/services/menu-builder.service";
import { MenuComposerService } from "../application/services/menu-composer.service";
import { ComposeMenuUseCase } from "../application/use-cases/compose-menu.usecase";
import { GetWorkspaceConfigUseCase } from "../application/use-cases/get-workspace-config.usecase";
import { OperationalPackageService } from "../application/services/operational-package.service";
import type { WorkspaceRepositoryPort } from "../../workspaces/application/ports/workspace-repository.port";
import type { TenantAppInstallRepositoryPort } from "../application/ports/tenant-app-install-repository.port";
import type { TenantMenuOverrideRepositoryPort } from "../application/ports/tenant-menu-override-repository.port";

const input = {
  tenantId: "tenant",
  userId: "user",
  workspaceId: "workspace",
  permissions: ["sales.invoices.read", "people.directory.read"],
  scope: "web" as const,
  surfaceId: "platform" as const,
  surfaceResolutionSource: "default" as const,
  surfaceHeaderMismatch: false,
  route: "/menu",
};
function setup() {
  const registry = new AppRegistry();
  registry.loadManifests();
  const installs = mockDeep<TenantAppInstallRepositoryPort>();
  installs.listEnabledByTenant.mockResolvedValue([]);
  installs.listByTenant.mockResolvedValue([
    {
      id: "disabled",
      tenantId: "tenant",
      appId: "invoices",
      enabled: false,
      installedVersion: "1.0.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const entitlements = mockDeep<TenantEntitlementService>();
  entitlements.getTenantEntitlement.mockResolvedValue(
    TenantEntitlement.fromEnabledApps(
      "tenant",
      ["invoices", "people", "parties", "accounting"],
      registry
    )
  );
  const workspace = mockDeep<WorkspaceRepositoryPort>();
  workspace.getWorkspaceByIdWithLegalEntity.mockResolvedValue({
    id: "workspace",
    tenantId: "tenant",
    legalEntityId: "legal",
    name: "Synthetic team",
    onboardingStatus: "PROFILE",
    createdAt: new Date(),
    updatedAt: new Date(),
    legalEntity: {
      id: "legal",
      tenantId: "tenant",
      kind: "COMPANY",
      legalName: "Synthetic team",
      countryCode: "DE",
      currency: "EUR",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  workspace.checkUserHasWorkspaceAccess.mockResolvedValue(true);
  workspace.getMembershipByUserAndWorkspace.mockResolvedValue({
    id: "membership",
    workspaceId: "workspace",
    userId: "user",
    role: "MEMBER",
    status: "ACTIVE",
    createdAt: new Date(),
  });
  const template = new WorkspaceTemplateService();
  vi.spyOn(template, "getDefaultEnabledApps").mockReturnValue(["invoices"]);
  const experience = new WorkspaceExperienceResolverService(entitlements, template, workspace);
  const overrides = mockDeep<TenantMenuOverrideRepositoryPort>();
  overrides.findByTenantAndScope.mockResolvedValue(null);
  const composer = new MenuComposerService(
    new MenuBuilderService(registry, entitlements, overrides)
  );
  return {
    installs,
    workspace,
    menu: new ComposeMenuUseCase(composer, experience, template, installs, registry),
    config: new GetWorkspaceConfigUseCase(
      composer,
      experience,
      template,
      workspace,
      installs,
      registry,
      mockDeep<OperationalPackageService>()
    ),
  };
}
describe("focused context through existing configuration use cases", () => {
  it.each(["invoice", "hr"] as const)(
    "returns only %s navigation and no unrelated home widgets without installing defaults",
    async (launchId) => {
      const f = setup();
      const config = await f.config.execute({ ...input, launchId });
      expect(WorkspaceConfigSchema.parse(config).launchId).toBe(launchId);
      expect(config.navigation.groups.map((group) => group.id)).toEqual([
        launchId === "invoice" ? "invoices" : "people",
      ]);
      expect(config.home.widgets).toEqual([]);
      const menu = await f.menu.execute({ ...input, launchId });
      expect(menu.launchId).toBe(launchId);
      expect(menu.groups.map((group) => group.appId)).toEqual([
        launchId === "invoice" ? "invoices" : "people",
      ]);
      expect(f.installs.upsert).not.toHaveBeenCalled();
    }
  );
  it("never revives an explicitly disabled default app on legacy menu reads", async () => {
    const f = setup();
    await f.menu.execute(input);
    expect(f.installs.upsert).not.toHaveBeenCalled();
  });
  it("rejects conflicting product/package selection and denied workspace membership", async () => {
    const f = setup();
    await expect(
      f.config.execute({ ...input, launchId: "invoice", packageId: "internal-operations" })
    ).rejects.toThrow();
    f.workspace.checkUserHasWorkspaceAccess.mockResolvedValue(false);
    await expect(f.config.execute({ ...input, launchId: "invoice" })).rejects.toThrow("access");
  });
});
