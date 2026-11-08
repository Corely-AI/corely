import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SsoSessionService } from "../application/services/sso-session.service";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { createSsoTestContext, ssoTestOrigins as origins } from "../testkit/sso-test-context";
import { SSO_IDLE_MS, SSO_ABSOLUTE_MS } from "../application/services/sso.service";

// Real transactional store: rotation/revocation/expiry must hold across replicas.
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("host session persistence", () => {
  let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
  let session: SsoSessionService;
  let handle: string;
  beforeEach(async () => {
    fixture = await createSsoTestContext();
    const login = await fixture.login(origins.invoice);
    handle = (await fixture.service.callback(origins.invoice, login.callback, login.handle)).handle;
    session = new SsoSessionService(
      fixture.registrations,
      fixture.store,
      fixture.crypto,
      { now: () => new Date() },
      new PrismaMembershipRepository(fixture.prisma),
      new PrismaTenantRepository(fixture.prisma),
      new AuthorizeRequestContextUseCase(
        new PrismaMembershipRepository(fixture.prisma),
        new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(fixture.prisma))
      )
    );
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture?.cleanup();
  });
  it("binds the cookie/CSRF to one app, rotates once and records audit/outbox together", async () => {
    const current = await session.authenticate(origins.invoice, handle);
    await expect(session.authenticate(origins.hr, handle)).rejects.toThrow();
    await expect(session.authenticate(origins.invoice, handle, "forged", true)).rejects.toThrow();
    const results = await Promise.allSettled([
      session.authenticate(origins.invoice, handle, current.csrfToken, true),
      session.authenticate(origins.invoice, handle, current.csrfToken, true),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rotated = results.find((r) => r.status === "fulfilled");
    if (rotated?.status !== "fulfilled") {
      throw new Error("No rotation");
    }
    expect(rotated.value.handle).toBeTruthy();
    expect(rotated.value.csrfToken).not.toBe(current.csrfToken);
    expect(rotated.value.expiresAt).toBe(current.expiresAt);
    await expect(session.authenticate(origins.invoice, handle)).rejects.toThrow();
    expect((await session.authenticate(origins.invoice, rotated.value.handle)).userId).toBe(
      fixture.userId
    );
    expect(
      await fixture.prisma.auditLog.count({
        where: { actorUserId: fixture.userId, action: "identity.sso.app_session_rotated" },
      })
    ).toBe(1);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: {
          eventType: "identity.sso.app_session_rotated",
          payloadJson: { contains: fixture.userId },
        },
      })
    ).toBe(1);
  });
  it("rolls back rotation if its transactional audit fails", async () => {
    const current = await session.authenticate(origins.invoice, handle);
    vi.spyOn(fixture.audit, "write").mockRejectedValueOnce(new Error("synthetic audit failure"));
    await expect(
      session.authenticate(origins.invoice, handle, current.csrfToken, true)
    ).rejects.toThrow("synthetic audit failure");
    expect((await session.authenticate(origins.invoice, handle)).userId).toBe(fixture.userId);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: {
          eventType: "identity.sso.app_session_rotated",
          payloadJson: { contains: fixture.userId },
        },
      })
    ).toBe(0);
  });
  it.each([
    "session-idle",
    "session-absolute",
    "family-idle",
    "family-absolute",
    "session-revoked",
    "family-revoked",
    "password",
    "user",
    "membership",
    "tenant",
  ])("rejects %s without renewal", async (failure) => {
    const row = await fixture.prisma.ssoAppSession.findUniqueOrThrow({
      where: { handleHash: fixture.crypto.hash(handle) },
    });
    const expired = new Date(Date.now() - 1000);
    if (failure === "session-idle") {
      await fixture.prisma.ssoAppSession.update({
        where: { id: row.id },
        data: { idleExpiresAt: expired },
      });
    }
    if (failure === "session-absolute") {
      await fixture.prisma.ssoAppSession.update({
        where: { id: row.id },
        data: { expiresAt: expired },
      });
    }
    if (failure === "family-idle") {
      await fixture.prisma.ssoCentralSession.update({
        where: { id: row.familyId },
        data: { idleExpiresAt: expired },
      });
    }
    if (failure === "family-absolute") {
      await fixture.prisma.ssoCentralSession.update({
        where: { id: row.familyId },
        data: { expiresAt: expired },
      });
    }
    if (failure === "session-revoked") {
      await fixture.prisma.ssoAppSession.update({
        where: { id: row.id },
        data: { revokedAt: expired },
      });
    }
    if (failure === "family-revoked") {
      await fixture.prisma.ssoCentralSession.update({
        where: { id: row.familyId },
        data: { revokedAt: expired },
      });
    }
    if (failure === "password") {
      await fixture.prisma.user.update({
        where: { id: fixture.userId },
        data: { passwordHash: "changed" },
      });
    }
    if (failure === "user") {
      await fixture.prisma.user.update({
        where: { id: fixture.userId },
        data: { status: "DISABLED" },
      });
    }
    if (failure === "membership") {
      await fixture.prisma.membership.delete({ where: { id: fixture.membership.id } });
    }
    if (failure === "tenant") {
      await fixture.prisma.tenant.update({
        where: { id: fixture.tenantId },
        data: { status: "SUSPENDED" },
      });
    }
    await expect(session.authenticate(origins.invoice, handle)).rejects.toThrow();
  });
  it("extends idle windows within the immutable absolute limit", async () => {
    const row = await fixture.prisma.ssoAppSession.findUniqueOrThrow({
      where: { handleHash: fixture.crypto.hash(handle) },
    });
    const now = new Date(Date.now() + SSO_IDLE_MS - 10_000);
    const updated = await fixture.store.useSession({
      handleHash: row.handleHash,
      appKey: "invoice",
      environment: fixture.registrations.environment,
      now,
      idleExpiresAt: new Date(now.getTime() + SSO_IDLE_MS),
    });
    expect(updated.idleExpiresAt.getTime()).toBeGreaterThan(row.idleExpiresAt.getTime());
    expect(updated.expiresAt).toEqual(row.expiresAt);
    await expect(
      fixture.store.useSession({
        handleHash: row.handleHash,
        appKey: "invoice",
        environment: fixture.registrations.environment,
        now: new Date(Date.now() + SSO_ABSOLUTE_MS + 1000),
        idleExpiresAt: new Date(Date.now() + SSO_ABSOLUTE_MS + SSO_IDLE_MS),
      })
    ).rejects.toThrow();
  });
});
