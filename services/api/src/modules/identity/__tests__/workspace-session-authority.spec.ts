import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { SsoSessionService } from "../application/services/sso-session.service";
import { SsoRegistrationService } from "../application/services/sso-registration.service";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import type { WorkspaceRepositoryPort } from "../../workspaces/application/ports/workspace-repository.port";
import type { Workspace } from "../../workspaces/domain/workspace.entity";
import type { MembershipRepositoryPort } from "../application/ports/membership-repository.port";
import type { TenantRepositoryPort } from "../application/ports/tenant-repository.port";
import type { UserRepositoryPort } from "../application/ports/user-repository.port";
import type { SsoStorePort } from "../application/ports/sso-store.port";
import type { SsoCryptoPort } from "../application/ports/sso-crypto.port";
import { Membership } from "../domain/entities/membership.entity";
import { Tenant } from "../domain/entities/tenant.entity";

function fixture() {
  const memberships = mockDeep<MembershipRepositoryPort>();
  const tenants = mockDeep<TenantRepositoryPort>();
  const workspaces = mockDeep<WorkspaceRepositoryPort>();
  memberships.findByTenantAndUser.mockImplementation(async (tenant, user) => {
    const pair = `${tenant}/${user}`;
    return ["tenant-a/user-a", "tenant-b/user-b"].includes(pair)
      ? Membership.create(`membership-${user}`, tenant, user, `role-${user}`)
      : null;
  });
  tenants.findById.mockImplementation(async (id) => {
    const tenant = mockDeep<Tenant>();
    tenant.isActive.mockReturnValue(["tenant-a", "tenant-b"].includes(id));
    return tenant;
  });
  workspaces.getWorkspaceById.mockImplementation(async (tenant, id) => {
    if (
      `${tenant}/${id}` !== "tenant-a/workspace-a" &&
      `${tenant}/${id}` !== "tenant-b/workspace-b"
    ) {
      return null;
    }
    const workspace = mockDeep<Workspace>();
    workspace.id = id;
    workspace.name = id;
    return workspace;
  });
  workspaces.getMembershipByUserAndWorkspace.mockImplementation(async (workspace, user) =>
    `${workspace}/${user}` === "workspace-a/user-a" ||
    `${workspace}/${user}` === "workspace-b/user-b"
      ? {
          id: `member-${user}`,
          workspaceId: workspace,
          userId: user,
          role: "MEMBER",
          status: "ACTIVE",
          createdAt: new Date(),
        }
      : null
  );
  const service = new SsoSessionService(
    mockDeep<SsoRegistrationService>(),
    mockDeep<SsoStorePort>(),
    mockDeep<SsoCryptoPort>(),
    { now: () => new Date() },
    memberships,
    tenants,
    new AuthorizeRequestContextUseCase(memberships, new AuthorizeWorkspaceUseCase(workspaces)),
    mockDeep<UserRepositoryPort>()
  );
  return { service, workspaces };
}
describe("workspace hints through actual session authorization use cases", () => {
  it.each(["a", "b"])(
    "preserves user %s's authorized tenant/workspace authority",
    async (suffix) => {
      const { service } = fixture();
      expect(
        await service.principal(`user-${suffix}`, `tenant-${suffix}`, `workspace-${suffix}`)
      ).toEqual({
        userId: `user-${suffix}`,
        tenantId: `tenant-${suffix}`,
        workspaceId: `workspace-${suffix}`,
        roleIds: [`role-user-${suffix}`],
      });
    }
  );
  it.each([
    ["user-a", "tenant-b", "workspace-b"],
    ["user-a", "tenant-a", "workspace-b"],
    ["user-b", "tenant-b", "workspace-a"],
    ["user-b", "tenant-b", "deleted"],
  ])("rejects altered hints %s/%s/%s", async (user, tenant, workspace) => {
    const { service } = fixture();
    await expect(service.principal(user, tenant, workspace)).rejects.toThrow();
  });
  it("revalidates revoked workspace membership rather than trusting previous discovery", async () => {
    const { service, workspaces } = fixture();
    await service.principal("user-a", "tenant-a", "workspace-a");
    workspaces.getMembershipByUserAndWorkspace.mockResolvedValue(null);
    await expect(service.principal("user-a", "tenant-a", "workspace-a")).rejects.toThrow(
      "Workspace access denied"
    );
  });
});
