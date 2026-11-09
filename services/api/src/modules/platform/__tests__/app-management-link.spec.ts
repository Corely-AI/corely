import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { GetEffectivePermissionsUseCase } from "../../identity/application/use-cases/get-effective-permissions.usecase";
import { GetAppManagementLinkUseCase } from "../application/use-cases/get-app-management-link.usecase";

describe("host app management discovery", () => {
  it("does not expose configuration to members and always resolves current host membership", async () => {
    const permissions = mockDeep<GetEffectivePermissionsUseCase>();
    permissions.execute.mockResolvedValue({
      permissions: { allowAll: false, allowed: [], denied: [] },
    });
    expect(
      await new GetAppManagementLinkUseCase(permissions).execute("tenant-a", "user-a")
    ).toEqual({});
    expect(permissions.execute).toHaveBeenCalledWith({ tenantId: null, userId: "user-a" });
  });
  it("links an authorized host admin to the selected tenant and respects explicit denials", async () => {
    const permissions = mockDeep<GetEffectivePermissionsUseCase>();
    permissions.execute.mockResolvedValue({
      permissions: { allowAll: true, allowed: [], denied: [] },
    });
    const useCase = new GetAppManagementLinkUseCase(permissions);
    expect(await useCase.execute("tenant/a", "user-a")).toEqual({
      path: "/settings/tenants/tenant%2Fa",
    });
    permissions.execute.mockResolvedValue({
      permissions: { allowAll: true, allowed: [], denied: ["platform.tenants.entitlements.write"] },
    });
    expect(await useCase.execute("tenant-a", "user-a")).toEqual({});
  });
});
