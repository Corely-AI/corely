import { randomUUID } from "node:crypto";
import { PrismaAuditAdapter, PrismaOutboxAdapter, type PrismaService } from "@corely/data";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import {
  AuthorizeRequestContextUseCase,
  GetWorkspacePermissionsUseCase,
} from "../../identity/public";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaMembershipRepository } from "../../identity/infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaRolePermissionGrantRepository } from "../../identity/infrastructure/adapters/prisma-role-permission-grant-repository.adapter";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { PrismaTenantAppInstallRepositoryAdapter } from "../../platform/infrastructure/adapters/prisma-tenant-app-install-repository.adapter";

export async function signFixture(prisma: PrismaService) {
  const uid = () => randomUUID();
  const tenantA = uid(),
    tenantB = uid(),
    workspaceA = uid(),
    workspaceA2 = uid(),
    workspaceB = uid();
  const manager = uid(),
    staff = uid(),
    outsider = uid();
  const managerRole = uid(),
    staffRole = uid(),
    otherRole = uid();
  for (const [tenantId, workspaces, users] of [
    [
      tenantA,
      [workspaceA, workspaceA2],
      [
        [manager, managerRole, "Manager"],
        [staff, staffRole, "Staff"],
      ],
    ],
    [tenantB, [workspaceB], [[outsider, otherRole, "Manager"]]],
  ] as const) {
    await prisma.tenant.create({ data: { id: tenantId, name: "Sign fixture", slug: tenantId } });
    const legal = await prisma.legalEntity.create({
      data: {
        tenantId,
        kind: "COMPANY",
        legalName: "Test company",
        countryCode: "DE",
        currency: "EUR",
      },
    });
    for (const id of workspaces) {
      await prisma.workspace.create({ data: { id, tenantId, legalEntityId: legal.id, name: id } });
    }
    for (const [id, roleId, name] of users) {
      await prisma.user.create({
        data: { id, email: `${id}@example.invalid`, name, passwordHash: "unused" },
      });
      await prisma.role.create({ data: { id: roleId, tenantId, name } });
      await prisma.membership.create({ data: { tenantId, userId: id, roleId } });
      for (const workspaceId of name === "Staff" ? [workspaceA] : workspaces) {
        await prisma.workspaceMembership.create({
          data: { workspaceId, userId: id, role: "MEMBER", status: "ACTIVE" },
        });
      }
    }
  }

  const memberships = new PrismaMembershipRepository(prisma);
  const authorizeWorkspace = new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(prisma));
  const permissions = new GetWorkspacePermissionsUseCase(
    new PrismaRolePermissionGrantRepository(prisma),
    memberships,
    authorizeWorkspace
  );
  const auth = new AuthGuard(
    {
      verifyAccessToken: async (token) =>
        token === "manager"
          ? {
              userId: manager,
              tenantId: tenantA,
              roleIds: [],
              email: "test@example.invalid",
              iat: 0,
              exp: 9999999999,
            }
          : null,
      generateAccessToken: () => "unused",
      generateRefreshToken: () => "unused",
      getExpirationTimes: () => ({ accessTokenExpiresIn: "1h", refreshTokenExpiresInMs: 3600000 }),
    },
    new AuthorizeRequestContextUseCase(memberships, authorizeWorkspace)
  );
  return {
    auth,
    permissions,
    manager,
    managerRole,
    staff,
    outsider,
    tenantA,
    tenantB,
    workspaceA,
    workspaceA2,
    workspaceB,
    audit: new PrismaAuditAdapter(prisma),
    outbox: new PrismaOutboxAdapter(prisma),
    appInstalls: new PrismaTenantAppInstallRepositoryAdapter(prisma),
    ctx: { tenantId: tenantA, workspaceId: workspaceA, userId: manager },
    async cleanup() {
      for (const tenantId of [tenantA, tenantB]) {
        await prisma.auditLog.deleteMany({ where: { tenantId } });
        await prisma.outboxEvent.deleteMany({ where: { tenantId } });
        await prisma.workspace.deleteMany({ where: { tenantId } });
        await prisma.legalEntity.deleteMany({ where: { tenantId } });
        await prisma.tenant.delete({ where: { id: tenantId } });
      }
      await prisma.user.deleteMany({ where: { id: { in: [manager, staff, outsider] } } });
    },
  };
}
