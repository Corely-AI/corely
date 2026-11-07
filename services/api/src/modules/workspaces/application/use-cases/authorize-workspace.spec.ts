import { describe, expect, it, vi } from "vitest";
import { AuthorizeWorkspaceUseCase } from "./authorize-workspace.usecase";
import type { Workspace, WorkspaceMembership } from "../../domain/workspace.entity";
const workspace: Workspace = {
  id: "w",
  tenantId: "t",
  legalEntityId: "l",
  name: "Studio",
  slug: "studio",
  onboardingStatus: "NEW",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const member: WorkspaceMembership = {
  id: "m",
  workspaceId: "w",
  userId: "u",
  role: "OWNER",
  status: "ACTIVE",
  createdAt: new Date(),
};
describe("OpenBuk workspace access policy", () => {
  const command = { tenantId: "t", workspaceId: "w", userId: "u", manage: true };
  it("resolves scope through the owner and permits an active owner", async () => {
    const getWorkspaceById = vi.fn(async () => workspace);
    const app = new AuthorizeWorkspaceUseCase({
      getWorkspaceById,
      getMembershipByUserAndWorkspace: async () => member,
    });
    expect(await app.execute(command)).toEqual({ name: "Studio", slug: "studio" });
    expect(getWorkspaceById).toHaveBeenCalledWith("t", "w");
  });
  it.each(["MEMBER", "VIEWER", "ACCOUNTANT"] as const)(
    "rejects configuration by %s",
    async (role) => {
      const app = new AuthorizeWorkspaceUseCase({
        getWorkspaceById: async () => workspace,
        getMembershipByUserAndWorkspace: async () => ({ ...member, role }),
      });
      await expect(app.execute(command)).rejects.toThrow("Workspace access denied");
    }
  );
  it("rejects a cross-tenant workspace even when user has a membership elsewhere", async () => {
    const app = new AuthorizeWorkspaceUseCase({
      getWorkspaceById: async () => null,
      getMembershipByUserAndWorkspace: async () => member,
    });
    await expect(app.execute(command)).rejects.toThrow("Workspace access denied");
  });
  it("rejects inactive members", async () => {
    const app = new AuthorizeWorkspaceUseCase({
      getWorkspaceById: async () => workspace,
      getMembershipByUserAndWorkspace: async () => ({ ...member, status: "DISABLED" }),
    });
    await expect(app.execute(command)).rejects.toThrow("Workspace access denied");
  });
});
