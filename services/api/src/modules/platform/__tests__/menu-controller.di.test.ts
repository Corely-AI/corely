import { GetAppManagementLinkUseCase } from "../application/use-cases/get-app-management-link.usecase";
import { describe, expect, it, vi } from "vitest";
import { MenuController } from "../adapters/http/menu.controller";
import { mockDeep } from "vitest-mock-extended";
import { ListAppLaunchesUseCase } from "../application/use-cases/list-app-launches.usecase";

describe("MenuController DI wiring", () => {
  it("constructs with required dependencies", () => {
    const composeMenuUseCase = { execute: vi.fn() };
    const updateMenuOverridesUseCase = { execute: vi.fn() };
    const resetMenuOverridesUseCase = { execute: vi.fn() };
    const grantRepo = { listByRoleIdsAndTenant: vi.fn() };

    const controller = new MenuController(
      composeMenuUseCase as any,
      updateMenuOverridesUseCase as any,
      resetMenuOverridesUseCase as any,
      grantRepo as any,
      mockDeep<ListAppLaunchesUseCase>(),
      mockDeep<GetAppManagementLinkUseCase>()
    );

    expect(controller).toBeDefined();
  });
});
