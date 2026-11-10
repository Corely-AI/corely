import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import request from "supertest";
import type { SsoAppKey } from "@corely/contracts";
import { SsoSessionService } from "../../identity/application/services/sso-session.service";
import { SsoHttpSecurity, SSO_COOKIES } from "../../identity/adapters/http/sso-http-security";
import { configureSsoSessionTransport } from "../../identity/adapters/http/sso-session-transport";
import {
  createSsoTestContext,
  ssoTestOrigins,
  ssoTestProxyKey,
} from "../../identity/testkit/sso-test-context";
import { PrismaMembershipRepository } from "../../identity/infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../../identity/infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "../../identity/infrastructure/adapters/prisma-user-repository.adapter";
import { AuthorizeRequestContextUseCase } from "../../identity/application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { staffFixture } from "./staff-fixture";

// Actual session store, guards, People use cases and persistence. No production hosts/data.
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)(
  "People privacy through real host sessions",
  () => {
    let sso: Awaited<ReturnType<typeof createSsoTestContext>>;
    let f: Awaited<ReturnType<typeof staffFixture>>;
    let staffId: string;
    const privateMarker = "synthetic398-confidential";
    beforeEach(async () => {
      sso = await createSsoTestContext(ssoTestOrigins, true);
      const members = new PrismaMembershipRepository(sso.prisma);
      const sessions = new SsoSessionService(
        sso.registrations,
        sso.store,
        sso.crypto,
        { now: () => new Date() },
        members,
        new PrismaTenantRepository(sso.prisma),
        new AuthorizeRequestContextUseCase(
          members,
          new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(sso.prisma))
        ),
        new PrismaUserRepository(sso.prisma)
      );
      f = await staffFixture(sso.prisma, undefined, undefined, {
        providers: [
          { provide: SsoSessionService, useValue: sessions },
          {
            provide: SsoHttpSecurity,
            useValue: new SsoHttpSecurity(sso.registrations, sso.crypto),
          },
        ],
        configure: configureSsoSessionTransport,
      });
      staffId = (
        await f.usecase.command(
          "create",
          null,
          { displayName: "Synthetic staff", accountId: f.staff, resourceId: f.resource.id },
          randomUUID(),
          f.ctx
        )
      ).id;
      await f.usecase.command(
        "private",
        staffId,
        { version: 0, personalEmail: "private398@example.invalid", notes: privateMarker },
        randomUUID(),
        f.ctx
      );
    });
    afterEach(async () => {
      vi.restoreAllMocks();
      await f?.cleanup();
      await sso?.cleanup();
    });
    async function sessionFor(userId: string, app: SsoAppKey = "hr") {
      const now = new Date(),
        expires = new Date(now.getTime() + 3600000),
        handle = sso.crypto.secret(),
        familyId = randomUUID();
      const user = await sso.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      await sso.prisma.ssoCentralSession.create({
        data: {
          id: familyId,
          environment: sso.registrations.environment,
          userId,
          handleHash: sso.crypto.hash(sso.crypto.secret()),
          credentialHash: createHash("sha256").update(user.passwordHash).digest("hex"),
          createdAt: now,
          expiresAt: expires,
          idleExpiresAt: expires,
        },
      });
      await sso.prisma.ssoAppSession.create({
        data: {
          id: randomUUID(),
          familyId,
          userId,
          appKey: app,
          environment: sso.registrations.environment,
          handleHash: sso.crypto.hash(handle),
          expiresAt: expires,
          idleExpiresAt: expires,
        },
      });
      const origin = app === "app-center" ? ssoTestOrigins.app : ssoTestOrigins[app];
      return {
        familyId,
        headers: {
          "x-corely-sso-origin": origin,
          "x-corely-sso-proxy-key": ssoTestProxyKey,
          Cookie: `${SSO_COOKIES.app}=${handle}`,
          "x-tenant-id": f.tenantA,
          "x-workspace-id": f.workspaceA,
        },
      };
    }
    const path = (suffix = "") => `/people/staff/${staffId}${suffix}`;
    function get(url: string, headers: Record<string, string>) {
      return request(f.app.getHttpServer()).get(url).set(headers);
    }
    it("does not grant People access to an Invoice-only identity through either API entry", async () => {
      await sso.prisma.rolePermissionGrant.deleteMany({ where: { roleId: f.staffRole } });
      await sso.prisma.rolePermissionGrant.create({
        data: {
          tenantId: f.tenantA,
          roleId: f.staffRole,
          permissionKey: "sales.invoices.read",
          effect: "ALLOW",
        },
      });
      const invoice = await sessionFor(f.staff, "invoice"),
        hr = await sessionFor(f.staff);
      const read = vi.spyOn(f.repo, "privateGet");
      for (const suffix of ["", "/private", "/management", "/absences", "/availability"]) {
        const bff = await get(`/api/bff${path(suffix)}`, invoice.headers);
        expect(bff.status).toBe(404);
        const hrResult = await get(`/api/bff${path(suffix)}`, hr.headers);
        expect(hrResult.status).toBe(403);
        const legacy = await get(path(suffix), {
          Authorization: "Bearer staff",
          "x-workspace-id": f.workspaceA,
        });
        expect(legacy.status).toBe(403);
        expect(JSON.stringify([bff.body, hrResult.body, legacy.body])).not.toContain(privateMarker);
      }
      expect((await get("/api/bff/people/staff?q=synthetic398", hr.headers)).status).toBe(403);
      expect(read).not.toHaveBeenCalled();
    });
    it("keeps staff directory and search neutral while authorized manager reads stay in the selected workspace", async () => {
      const staff = await sessionFor(f.staff),
        manager = await sessionFor(f.manager);
      const read = vi.spyOn(f.repo, "privateGet");
      const neutral = await get(`/api/bff${path()}`, staff.headers);
      expect(neutral.status).toBe(200);
      expect(neutral.headers["cache-control"]).toContain("no-store");
      expect(neutral.body).not.toHaveProperty("accountId");
      for (const query of [privateMarker, "private398@example.invalid"]) {
        const search = await get(
          `/api/bff/people/staff?q=${encodeURIComponent(query)}`,
          staff.headers
        );
        expect(search.status).toBe(200);
        expect(search.body.total).toBe(0);
      }
      expect((await get(`/api/bff${path("/private")}`, staff.headers)).status).toBe(403);
      expect(read).not.toHaveBeenCalled();
      const allowed = await get(`/api/bff${path("/private")}`, manager.headers);
      expect(allowed.status).toBe(200);
      expect(allowed.body.notes).toBe(privateMarker);
      expect(
        (
          await get(`/api/bff${path("/private")}`, {
            ...manager.headers,
            "x-workspace-id": f.workspaceA2,
          })
        ).status
      ).toBe(404);
      expect(
        (
          await get(`/api/bff${path("/private")}`, {
            ...manager.headers,
            "x-tenant-id": f.tenantB,
            "x-workspace-id": f.workspaceB,
          })
        ).status
      ).toBe(403);
    });
    it("rechecks permission changes without waiting for the host session to expire", async () => {
      const manager = await sessionFor(f.manager);
      expect((await get(`/api/bff${path("/private")}`, manager.headers)).status).toBe(200);
      await sso.prisma.rolePermissionGrant.upsert({
        where: {
          tenantId_roleId_permissionKey: {
            tenantId: f.tenantA,
            roleId: f.managerRole,
            permissionKey: "people.private.read",
          },
        },
        create: {
          tenantId: f.tenantA,
          roleId: f.managerRole,
          permissionKey: "people.private.read",
          effect: "DENY",
        },
        update: { effect: "DENY" },
      });
      const read = vi.spyOn(f.repo, "privateGet");
      const denied = await get(`/api/bff${path("/private")}`, manager.headers);
      expect(denied.status).toBe(403);
      expect(denied.text).not.toContain(privateMarker);
      expect(read).not.toHaveBeenCalled();
    });
    it.each(["workspace", "account", "family"] as const)(
      "honors %s revocation before reading personnel",
      async (kind) => {
        const manager = await sessionFor(f.manager);
        expect((await get(`/api/bff${path("/private")}`, manager.headers)).status).toBe(200);
        if (kind === "workspace") {
          await sso.prisma.workspaceMembership.updateMany({
            where: { userId: f.manager, workspaceId: f.workspaceA },
            data: { status: "DISABLED" },
          });
        }
        if (kind === "account") {
          await sso.prisma.user.update({ where: { id: f.manager }, data: { status: "DISABLED" } });
        }
        if (kind === "family") {
          await sso.prisma.ssoCentralSession.update({
            where: { id: manager.familyId },
            data: { revokedAt: new Date() },
          });
        }
        const read = vi.spyOn(f.repo, "privateGet");
        expect((await get(`/api/bff${path("/private")}`, manager.headers)).status).toBe(
          kind === "workspace" ? 403 : 401
        );
        expect(read).not.toHaveBeenCalled();
      }
    );
  }
);
