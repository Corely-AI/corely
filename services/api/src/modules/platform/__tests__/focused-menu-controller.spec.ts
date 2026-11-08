import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { MenuController } from "../adapters/http/menu.controller";
import { ComposeMenuUseCase } from "../application/use-cases/compose-menu.usecase";
import { UpdateMenuOverridesUseCase } from "../application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "../application/use-cases/reset-menu-overrides.usecase";
import type { RolePermissionGrantRepositoryPort } from "../../identity/application/ports/role-permission-grant-repository.port";
import type { ContextAwareRequest } from "../../../shared/request-context";
function setup() {
  const compose = mockDeep<ComposeMenuUseCase>();
  const controller = new MenuController(
    compose,
    mockDeep<UpdateMenuOverridesUseCase>(),
    mockDeep<ResetMenuOverridesUseCase>(),
    mockDeep<RolePermissionGrantRepositoryPort>()
  );
  const req = mockDeep<ContextAwareRequest>();
  req.headers = { "x-workspace-id": "authorized-workspace" };
  req.user = { userId: "user", tenantId: "tenant", roleIds: [] };
  req.params = {};
  req.query = { workspaceId: "other-workspace" };
  req.publicContext = undefined;
  return { controller, compose, req };
}
describe("focused menu HTTP input", () => {
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
