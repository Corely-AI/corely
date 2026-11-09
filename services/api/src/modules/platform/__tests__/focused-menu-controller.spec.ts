import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { MenuController } from "../adapters/http/menu.controller";
import { ComposeMenuUseCase } from "../application/use-cases/compose-menu.usecase";
import { ListAppLaunchesUseCase } from "../application/use-cases/list-app-launches.usecase";
import { UpdateMenuOverridesUseCase } from "../application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "../application/use-cases/reset-menu-overrides.usecase";
import type { RolePermissionGrantRepositoryPort } from "../../identity/application/ports/role-permission-grant-repository.port";
import type { ContextAwareRequest } from "../../../shared/request-context";
function setup() {
  const compose = mockDeep<ComposeMenuUseCase>();
  const launches = mockDeep<ListAppLaunchesUseCase>();
  const grants = mockDeep<RolePermissionGrantRepositoryPort>();
  const controller = new MenuController(
    compose,
    mockDeep<UpdateMenuOverridesUseCase>(),
    mockDeep<ResetMenuOverridesUseCase>(),
    grants,
    launches
  );
  const req = mockDeep<ContextAwareRequest>();
  req.headers = { "x-workspace-id": "authorized-workspace" };
  req.user = { userId: "user", tenantId: "tenant", roleIds: [] };
  req.params = {};
  req.query = { workspaceId: "other-workspace" };
  req.publicContext = undefined;
  return { controller, compose, req, launches, grants };
}
describe("focused menu HTTP input", () => {
  it("projects staff launches through trusted scope without an admin catalog permission", async () => {
    const { controller, req, launches, grants } = setup();
    grants.listByRoleIdsAndTenant.mockResolvedValue([]);
    launches.execute.mockResolvedValue([]);
    expect(await controller.getLaunches("tenant", "user", ["member"], req)).toEqual([]);
    expect(grants.listByRoleIdsAndTenant).toHaveBeenCalledWith("tenant", ["member"]);
    expect(launches.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant",
        userId: "user",
        workspaceId: "authorized-workspace",
        permissions: [],
        scope: "web",
      })
    );
  });
  it("composes the workspace AuthGuard resolves instead of a competing query selector", async () => {
    const { controller, compose, req } = setup();
    await controller.getMenu("web", "other-workspace", "tenant", "user", [], req, "invoice");
    expect(compose.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "authorized-workspace", launchId: "invoice" })
    );
  });
  it("rejects malformed focused context before composition", async () => {
    const { controller, compose, req } = setup();
    await expect(
      controller.getMenu("web", undefined, "tenant", "user", [], req, "invoices")
    ).rejects.toThrow();
    expect(compose.execute).not.toHaveBeenCalled();
  });
});
