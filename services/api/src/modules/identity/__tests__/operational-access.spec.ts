import { Controller, Get, Module, Req, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { AuthGuard } from "../adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../adapters/http/rbac.guard";
import { GetEffectivePermissionsUseCase } from "../application/use-cases/get-effective-permissions.usecase";
import { Membership } from "../domain/entities/membership.entity";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { DocumentsController } from "../../documents/adapters/http/documents.controller";
import { DocumentsApplication } from "../../documents/application/documents.application";
import { AuthorizeToolService } from "../../ai-copilot/application/services/authorize-tool.service";
import type { DomainToolPort } from "../../ai-copilot/application/ports/domain-tool.port";
import { z } from "zod";
import { buildDefaultRoleGrants } from "../permissions/default-role-grants";
import { identityPermissions } from "../permissions/identity.permissions";
import { resolveRequestContext } from "../../../shared/request-context";
import type { ContextAwareRequest } from "../../../shared/request-context";
import type { RolePermissionEffect } from "@corely/contracts";
import { ok } from "@corely/kernel";

@Controller("operational-fixture")
@UseGuards(AuthGuard, RbacGuard)
class ProtectedController {
  @Get("current-role")
  currentRole(@Req() req: ContextAwareRequest) {
    return { roleIds: req.user?.roleIds };
  }

  @Get("directory")
  @RequirePermission("people.directory.read")
  directory() {
    return { name: "Synthetic staff", unavailable: true };
  }
  @Get("export")
  @RequirePermission("people.export")
  export() {
    return { restricted: true };
  }
  @Get("private")
  @RequirePermission("people.private.read")
  privateProfile() {
    return { reason: "Synthetic private value" };
  }
}

@Module({
  controllers: [ProtectedController, DocumentsController],
  providers: [DocumentsApplication],
})
class FixtureModule {}

describe("Operational authorization HTTP and tool boundaries", () => {
  let app: INestApplication;
  let member = true;
  let workspaceMember = true;
  let grants: Array<{ key: string; effect: RolePermissionEffect }> = [];
  const membership = vi.fn(async (tenantId: string | null, userId: string) => {
    if (!member) return null;
    if (tenantId === "tenant-a" && userId === "user")
      return Membership.create("membership", tenantId, userId, "current-role");
    if (tenantId === "tenant-b" && userId === "user-b")
      return Membership.create("membership-b", tenantId, userId, "current-role-b");
    return null;
  });
  const grantRepo = {
    listByRoleIdsAndTenant: vi.fn(async () => grants),
    listByRoleIds: vi.fn(async () => grants),
    replaceAll: vi.fn(),
  };
  const authorizeWorkspace = new AuthorizeWorkspaceUseCase({
    getWorkspaceById: async (tenantId, id) =>
      (tenantId === "tenant-a" && ["workspace-a", "workspace-a2"].includes(id)) ||
      (tenantId === "tenant-b" && id === "workspace-b")
        ? {
            id,
            tenantId,
            legalEntityId: "legal",
            name: "Workspace",
            onboardingStatus: "NEW",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    getMembershipByUserAndWorkspace: async (workspaceId, userId) =>
      workspaceMember &&
      ((workspaceId === "workspace-a" && userId === "user") ||
        (workspaceId === "workspace-b" && userId === "user-b"))
        ? { id: "wm", workspaceId, userId, role: "MEMBER", status: "ACTIVE", createdAt: new Date() }
        : null,
  });
  const memberships = {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findHostMembership: vi.fn(),
    findByTenantId: vi.fn(),
    findByTenantAndUser: membership,
    existsByTenantAndUser: vi.fn(),
    existsByRole: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const currentPermissions = new GetEffectivePermissionsUseCase(
    grantRepo,
    memberships,
    authorizeWorkspace
  );
  const signedFile = vi.fn(async () =>
    ok({ url: "https://storage.invalid/synthetic", expiresAt: new Date().toISOString() })
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [FixtureModule],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        new AuthGuard(
          {
            generateAccessToken: vi.fn(),
            generateRefreshToken: vi.fn(),
            getExpirationTimes: vi.fn(),
            verifyAccessToken: async (token) =>
              ["valid-token", "valid-token-b"].includes(token)
                ? {
                    userId: token === "valid-token" ? "user" : "user-b",
                    tenantId: token === "valid-token" ? "tenant-a" : "tenant-b",
                    roleIds: ["stale-admin"],
                    email: "synthetic@example.invalid",
                    iat: 0,
                    exp: 9999999999,
                  }
                : null,
          },
          new AuthorizeRequestContextUseCase(memberships, authorizeWorkspace)
        )
      )
      .overrideGuard(RbacGuard)
      .useValue(new RbacGuard(new (await import("@nestjs/core")).Reflector(), currentPermissions))
      .overrideProvider(DocumentsApplication)
      .useValue({ getDownloadUrl: { execute: signedFile } })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    member = true;
    workspaceMember = true;
    grants = [{ key: "people.directory.read", effect: "ALLOW" }];
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await app?.close();
  });
  const get = (path: string, workspace = "workspace-a") =>
    request(app.getHttpServer())
      .get(path)
      .set("Authorization", "Bearer valid-token")
      .set("x-workspace-id", workspace);

  it("serves permitted neutral fields and does not expose private fields", async () => {
    const res = await get("/operational-fixture/directory");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "Synthetic staff", unavailable: true });
    expect((await get("/operational-fixture/private")).status).toBe(403);
    expect(grantRepo.listByRoleIdsAndTenant).toHaveBeenCalledWith("tenant-a", ["current-role"]);
  });
  it("ignores spoofed tenant/user headers and denies a cross-tenant workspace", async () => {
    expect(
      (
        await get("/operational-fixture/directory", "workspace-b")
          .set("x-tenant-id", "tenant-b")
          .set("x-user-id", "admin")
      ).status
    ).toBe(403);
  });
  it("isolates two valid tenant/workspace contexts in both directions", async () => {
    expect(
      (
        await get("/operational-fixture/directory", "workspace-b").set(
          "Authorization",
          "Bearer valid-token-b"
        )
      ).status
    ).toBe(200);
    expect(
      (await get("/operational-fixture/directory").set("Authorization", "Bearer valid-token-b"))
        .status
    ).toBe(403);
    expect((await get("/operational-fixture/directory", "workspace-b")).status).toBe(403);
  });
  it("denies another workspace in the same tenant and a nonexistent workspace", async () => {
    expect((await get("/operational-fixture/directory", "workspace-a2")).status).toBe(403);
    expect((await get("/operational-fixture/directory", "missing")).status).toBe(403);
  });
  it("revokes tenant and workspace membership without changing the token", async () => {
    expect((await get("/operational-fixture/directory")).status).toBe(200);
    member = false;
    expect((await get("/operational-fixture/directory")).status).toBe(403);
    member = true;
    workspaceMember = false;
    expect((await get("/operational-fixture/directory")).status).toBe(403);
  });
  it("refreshes token roles and checks membership on authentication-only routes", async () => {
    expect((await get("/operational-fixture/current-role")).body).toEqual({
      roleIds: ["current-role"],
    });
    member = false;
    expect((await get("/operational-fixture/current-role")).status).toBe(403);
  });
  it("rejects raw identity headers without a token outside the integration-test seam", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(
        (
          await request(app.getHttpServer())
            .get("/operational-fixture/directory")
            .set("x-user-id", "user")
            .set("x-tenant-id", "tenant-a")
            .set("x-workspace-id", "workspace-a")
        ).status
      ).toBe(401);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("checks changed grants on every export request", async () => {
    grants = [{ key: "people.export", effect: "ALLOW" }];
    expect((await get("/operational-fixture/export")).status).toBe(200);
    grants = [];
    expect((await get("/operational-fixture/export")).status).toBe(403);
  });
  it("denies direct signed-file requests before the document use case", async () => {
    expect((await get("/documents/document-a/download-url")).status).toBe(403);
    expect(signedFile).not.toHaveBeenCalled();
  });
  it("checks tenant membership even when no workspace selector is sent", async () => {
    member = false;
    const res = await request(app.getHttpServer())
      .get("/operational-fixture/directory")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });
  it("honors explicit deny even when a role has an explicit wildcard grant", async () => {
    grants = [{ key: "*", effect: "ALLOW" }];
    expect((await get("/operational-fixture/private")).status).toBe(200);
    grants.push({ key: "people.private.read", effect: "DENY" });
    expect((await get("/operational-fixture/private")).status).toBe(403);
    grants = [];
    expect((await get("/operational-fixture/export")).status).toBe(403);
  });
  it("requires explicit current host grants despite privileged token roles", async () => {
    grants = [];
    const hostPermissions = new GetEffectivePermissionsUseCase(
      grantRepo,
      {
        ...memberships,
        findByTenantAndUser: vi.fn(async () =>
          Membership.create("host-membership", null, "host-user", "host-role")
        ),
      },
      authorizeWorkspace
    );
    const ctx = { userId: "host-user", tenantId: null, roles: ["stale-host-owner"] };
    expect((await hostPermissions.execute(ctx)).permissions).toEqual({
      allowAll: false,
      allowed: [],
      denied: [],
    });
    grants = [{ key: "platform.tenants.read", effect: "ALLOW" }];
    expect((await hostPermissions.execute(ctx)).permissions).toEqual({
      allowAll: false,
      allowed: ["platform.tenants.read"],
      denied: [],
    });
    expect(grantRepo.listByRoleIds).toHaveBeenCalledWith(["host-role"]);
  });
  it("allows explicitly granted document reads but still rejects foreign workspaces", async () => {
    grants = [{ key: "documents.read", effect: "ALLOW" }];
    expect((await get("/documents/document-a/download-url")).status).toBe(200);
    expect(signedFile).toHaveBeenCalledOnce();
    expect((await get("/documents/document-a/download-url", "workspace-b")).status).toBe(403);
    expect(signedFile).toHaveBeenCalledOnce();
  });
  it("does not fabricate a workspace or identity from raw headers", () => {
    const ctx = resolveRequestContext({
      headers: { "x-user-id": "forged" },
      params: {},
    } as unknown as ContextAwareRequest);
    expect(ctx.userId).toBeUndefined();
    expect(ctx.workspaceId).toBeNull();
  });
  it("revalidates tools after role revocation rather than trusting an exposed tool", async () => {
    const tools = new AuthorizeToolService(currentPermissions);
    const tool: DomainToolPort = {
      name: "private_lookup",
      description: "Synthetic lookup",
      inputSchema: z.object({}),
      kind: "server",
      requiredPermissions: ["people.private.read"],
    };
    const ctx = { userId: "user", tenantId: "tenant-a", workspaceId: "workspace-a" };
    grants = [{ key: "people.private.read", effect: "ALLOW" }];
    await expect(tools.assert(tool, ctx)).resolves.toBeUndefined();
    grants = [];
    await expect(tools.assert(tool, ctx)).rejects.toThrow("Tool access denied");
    await expect(tools.assert(tool, { ...ctx, workspaceId: "workspace-a2" })).rejects.toThrow();
  });
  it("filters prompt tools by permission without hiding client confirmation UI", async () => {
    const tools = new AuthorizeToolService(currentPermissions);
    const directory: DomainToolPort = {
      name: "directory",
      description: "Neutral directory",
      kind: "server",
      inputSchema: z.object({}),
      requiredPermissions: ["people.directory.read"],
    };
    const restricted: DomainToolPort = {
      ...directory,
      name: "private",
      requiredPermissions: ["people.private.read"],
    };
    const confirm: DomainToolPort = { ...directory, name: "confirm", kind: "client-confirm" };
    const ctx = { userId: "user", tenantId: "tenant-a", workspaceId: "workspace-a" };
    expect(
      (await tools.filterAllowed([directory, restricted, confirm], ctx)).map((t) => t.name)
    ).toEqual(["directory", "confirm"]);
    grants = [{ key: "people.private.read", effect: "ALLOW" }];
    expect(
      (await tools.filterAllowed([directory, restricted, confirm], ctx)).map((t) => t.name)
    ).toEqual(["private", "confirm"]);
  });
  it("hides undeclared tools unless explicitly wildcard-granted and rechecks revocation", async () => {
    const tools = new AuthorizeToolService(currentPermissions);
    const legacy: DomainToolPort = {
      name: "legacy",
      description: "Synthetic legacy tool",
      inputSchema: z.object({}),
      kind: "server",
    };
    const ctx = { userId: "user", tenantId: "tenant-a", workspaceId: "workspace-a" };
    expect(await tools.allows(legacy, ctx)).toBe(false);
    grants = [{ key: "*", effect: "ALLOW" }];
    expect(await tools.allows(legacy, ctx)).toBe(true);
    grants.push({ key: "people.private.read", effect: "DENY" });
    expect(await tools.allows(legacy, ctx)).toBe(false);
    grants = [];
    await expect(tools.assert(legacy, ctx)).rejects.toThrow("Tool access denied");
    expect(await tools.allows(legacy, { ...ctx, workspaceId: undefined })).toBe(false);
  });
  it("excludes sensitive reads from automatic staff/read-only grants", () => {
    const defaults = buildDefaultRoleGrants(identityPermissions);
    for (const key of ["STAFF", "READ_ONLY"] as const) {
      expect(defaults[key].some((x) => x.key === "people.directory.read")).toBe(true);
      expect(
        defaults[key].some(
          (x) =>
            x.key === "people.private.read" ||
            x.key === "documents.read" ||
            x.key === "people.audit.read"
        )
      ).toBe(false);
    }
  });
});
