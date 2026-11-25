import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import { PrismaService } from "@corely/data";
import { Test, type TestingModule } from "@nestjs/testing";
import { TenantEntitlementsService } from "../../platform-entitlements";
import { EnableAppUseCase } from "../../platform/public";
import { ListAppLaunchesUseCase } from "../../platform/application/use-cases/list-app-launches.usecase";
import {
  APP_INVOICE_LAUNCH_ENABLED_TOKEN,
  APP_LAUNCH_ORIGINS_TOKEN,
} from "../../platform/application/ports/app-launch-origins.port";
import { CreateWorkspaceUseCase } from "../../workspaces/application/use-cases/create-workspace.usecase";
import { PilotSetupUseCase } from "../../workspaces/application/use-cases/pilot-setup.usecase";
import { IdentityModule } from "../identity.module";
import { SignUpUseCase } from "../application/use-cases/sign-up.usecase";
import {
  PASSWORD_RESET_EMAIL_PORT,
  type PasswordResetEmailPort,
} from "../application/ports/password-reset-email.port";
import { buildSignUpInput } from "../testkit/builders/build-signup-input";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

const appPaths = {
  invoices: "/invoices",
  expenses: "/expenses",
  booking: "/booking/bookings",
  sign: "/sign",
};

describe("Sign Up integration (Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let useCase: SignUpUseCase;
  let module: TestingModule;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;

    module = await Test.createTestingModule({ imports: [IdentityModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(PASSWORD_RESET_EMAIL_PORT)
      .useValue({ send: async () => {} } satisfies PasswordResetEmailPort)
      .overrideProvider(APP_LAUNCH_ORIGINS_TOKEN)
      .useValue({ legacy: "https://app.example.test" })
      .overrideProvider(APP_INVOICE_LAUNCH_ENABLED_TOKEN)
      .useValue(false)
      .compile();
    await module.init();
    useCase = module.get(SignUpUseCase);
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await module?.close();
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("creates a new user and stores it in the database", async () => {
    const input = buildSignUpInput({
      email: "newuser@example.com",
      password: "password123",
      tenantName: "Test Company",
      idempotencyKey: "signup-test-1",
    });

    const result = await useCase.execute(input);

    // Verify the response
    expect(result.userId).toBeDefined();
    expect(result.email).toBe("newuser@example.com");
    expect(result.tenantId).toBeDefined();
    expect(result.tenantName).toBe("Test Company");
    expect(result.membershipId).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // Verify user was created in the database
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });
    expect(user).not.toBeNull();
    expect(user?.email).toBe("newuser@example.com");
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe("password123"); // Should be hashed

    // Verify tenant was created
    const tenant = await prisma.tenant.findUnique({
      where: { id: result.tenantId },
    });
    expect(tenant).not.toBeNull();
    expect(tenant?.name).toBe("Test Company");
    expect(tenant?.slug).toBe("testcompany");

    // Verify membership was created
    const membership = await prisma.membership.findUnique({
      where: { id: result.membershipId },
    });
    expect(membership).not.toBeNull();
    expect(membership?.userId).toBe(result.userId);
    expect(membership?.tenantId).toBe(result.tenantId);

    // Verify role was created
    const role = await prisma.role.findUnique({
      where: { id: membership!.roleId },
    });
    expect(role).not.toBeNull();
    expect(role?.systemKey).toBe("OWNER");
    expect(role?.name).toBe("Owner");

    // Verify refresh token was created
    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: result.userId },
    });
    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0].tenantId).toBe(result.tenantId);

    // Verify outbox events were created
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { tenantId: result.tenantId },
    });
    expect(outboxEvents.length).toBeGreaterThanOrEqual(3);
    const eventTypes = outboxEvents.map((e) => e.eventType);
    expect(eventTypes).toContain("identity.user.created");
    expect(eventTypes).toContain("identity.tenant.created");
    expect(eventTypes).toContain("identity.membership.created");

    // Verify audit log was created
    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId: result.tenantId, action: "identity.sign_up" },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe("identity.sign_up");
    expect(auditLogs[0].entityId).toBe(result.userId);
  });

  it.each(["PERSONAL", "COMPANY"] as const)(
    "provides all four App Center destinations after %s workspace setup",
    async (kind) => {
      const owner = await useCase.execute(
        buildSignUpInput({
          email: `${kind.toLowerCase()}-apps@example.test`,
          tenantName: `${kind} Apps`,
          idempotencyKey: `${kind}-signup-apps`,
        })
      );
      const { tenantId, userId } = owner;
      const installs = await prisma.tenantAppInstall.findMany({
        where: { tenantId, enabled: true },
      });
      expect(installs.map(({ appId }) => appId)).toEqual(
        expect.arrayContaining([...Object.keys(appPaths), "parties"])
      );
      const { workspace } = await module.get(CreateWorkspaceUseCase).execute({
        tenantId,
        userId,
        name: `${kind} workspace`,
        kind,
      });
      expect(workspace.publicEnabled).toBe(false);

      const membership = await prisma.membership.findUniqueOrThrow({
        where: { id: owner.membershipId },
      });
      const grants = await prisma.rolePermissionGrant.findMany({
        where: { tenantId, roleId: membership.roleId, effect: "ALLOW" },
      });
      const launches = await module.get(ListAppLaunchesUseCase).execute({
        tenantId,
        userId,
        workspaceId: workspace.id,
        permissions: grants.map((grant) => grant.permissionKey),
        surfaceId: "platform",
        surfaceResolutionSource: "fallback",
        surfaceHeaderMismatch: false,
        scope: "web",
        route: "/menu/launches",
      });
      for (const [appId, path] of Object.entries(appPaths)) {
        expect(launches.find((item) => item.appId === appId)?.directory?.destination?.path).toBe(
          path
        );
      }
    }
  );

  it("preserves an existing tenant's disabled app when a newly registered member joins", async () => {
    const owner = await useCase.execute(
      buildSignUpInput({
        email: "workspace-owner@example.test",
        idempotencyKey: "invite-owner-signup",
      })
    );
    const { tenantId, userId } = owner;
    const { workspace } = await module.get(CreateWorkspaceUseCase).execute({
      tenantId,
      userId,
      name: "Existing workspace",
      kind: "COMPANY",
    });
    const entitlements = module.get(TenantEntitlementsService);
    await entitlements.updateAppEnablement(tenantId, "sign", false, userId);

    const email = "workspace-invitee@example.test";
    const invitations = module.get(PilotSetupUseCase);
    const { invite } = await invitations.invite(workspace.id, email, { tenantId, userId });
    const invitee = await useCase.execute(
      buildSignUpInput({ email, tenantName: "Invitee team", idempotencyKey: "invitee-signup" })
    );
    const joined = await invitations.accept(invite.token, {
      tenantId: invitee.tenantId,
      userId: invitee.userId,
    });

    expect(joined).toMatchObject({ tenantId, workspaceId: workspace.id });
    expect((await entitlements.getEntitlements(tenantId)).apps).toContainEqual(
      expect.objectContaining({ appId: "sign", enabled: false })
    );
    expect((await entitlements.getEntitlements(invitee.tenantId)).apps).toContainEqual(
      expect.objectContaining({ appId: "sign", enabled: true })
    );
  });

  it("rolls back signup and partial app installs when provisioning fails", async () => {
    const input = buildSignUpInput({
      email: "rollback-signup@example.test",
      tenantName: "Rollback Signup",
      idempotencyKey: "rollback-app-provisioning",
    });
    const enable = module.get(EnableAppUseCase);
    const execute = enable.execute.bind(enable);
    const fail = vi.spyOn(enable, "execute").mockImplementation(async (command, tx) => {
      if (command.appId === "sign") {
        throw new Error("App provisioning unavailable");
      }
      return execute(command, tx);
    });
    try {
      await expect(useCase.execute(input)).rejects.toThrow("App provisioning unavailable");
    } finally {
      fail.mockRestore();
    }

    expect(await prisma.tenant.findUnique({ where: { slug: "rollbacksignup" } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: input.email } })).toBeNull();
    const retry = await useCase.execute(input);
    expect(await prisma.tenantAppInstall.count({ where: { tenantId: retry.tenantId } })).toBe(5);
  });

  it("is idempotent - returns same result for duplicate idempotency key", async () => {
    const input = buildSignUpInput({
      email: "idempotent@example.com",
      password: "password123",
      tenantName: "Idempotent Test",
      idempotencyKey: "same-key-123",
    });

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    // Results should be identical
    expect(second.userId).toBe(first.userId);
    expect(second.tenantId).toBe(first.tenantId);
    expect(second.membershipId).toBe(first.membershipId);
    expect(second.email).toBe(first.email);

    // Should only have one user in the database
    const users = await prisma.user.findMany({
      where: { email: "idempotent@example.com" },
    });
    expect(users).toHaveLength(1);

    // Should only have one tenant
    const tenants = await prisma.tenant.findMany({
      where: { id: first.tenantId },
    });
    expect(tenants).toHaveLength(1);

    // Verify idempotency record was stored
    const idemRows = await prisma.idempotencyKey.findMany({
      where: { key: "same-key-123" },
    });
    expect(idemRows).toHaveLength(1);
  });

  it("rejects duplicate email addresses", async () => {
    const firstInput = buildSignUpInput({
      email: "duplicate@example.com",
      password: "password123",
      tenantName: "First Company",
      idempotencyKey: "first-signup",
    });

    await useCase.execute(firstInput);

    const secondInput = buildSignUpInput({
      email: "duplicate@example.com",
      password: "password456",
      tenantName: "Second Company",
      idempotencyKey: "second-signup",
    });

    await expect(useCase.execute(secondInput)).rejects.toThrow(
      "User with this email already exists"
    );

    // Should still only have one user
    const users = await prisma.user.findMany({
      where: { email: "duplicate@example.com" },
    });
    expect(users).toHaveLength(1);
  });

  it("stores user with optional name field", async () => {
    const input = buildSignUpInput({
      email: "withname@example.com",
      password: "password123",
      tenantName: "Name Test Company",
      userName: "John Doe",
      idempotencyKey: "name-test-1",
    });

    const result = await useCase.execute(input);

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });
    expect(user?.name).toBe("John Doe");
  });

  it("creates a unique tenant slug when the derived slug already exists", async () => {
    const first = await useCase.execute(
      buildSignUpInput({
        email: "slug-one@example.com",
        password: "password123",
        tenantName: "Acme Team",
        idempotencyKey: "slug-test-1",
      })
    );

    const second = await useCase.execute(
      buildSignUpInput({
        email: "slug-two@example.com",
        password: "password123",
        tenantName: "Acme Team",
        idempotencyKey: "slug-test-2",
      })
    );

    const tenants = await prisma.tenant.findMany({
      where: { id: { in: [first.tenantId, second.tenantId] } },
      orderBy: { createdAt: "asc" },
    });

    expect(tenants).toHaveLength(2);
    expect(tenants[0]?.slug).toBe("acmeteam");
    expect(tenants[1]?.slug).toBe("acmeteam-2");
  });
});
