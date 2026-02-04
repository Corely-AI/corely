import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";
import { type PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import { PrismaUnitOfWork } from "@corely/data";
import type { PrismaService } from "@corely/data";
import type { EnvService } from "@corely/config";
import { buildRequestContext } from "@shared/context/request-context";
import { ValidationError } from "@corely/kernel";
import { RequestPasswordResetUseCase } from "../application/use-cases/request-password-reset.usecase";
import { ConfirmPasswordResetUseCase } from "../application/use-cases/confirm-password-reset.usecase";
import { PrismaUserRepository } from "../infrastructure/adapters/prisma-user-repository.adapter";
import { PrismaPasswordResetTokenRepository } from "../infrastructure/adapters/prisma-password-reset-token-repository.adapter";
import { BcryptPasswordHasher } from "../infrastructure/security/bcrypt.password-hasher";
import { SystemIdGenerator } from "../../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../../shared/infrastructure/system-clock";
import { FakePasswordResetEmailSender } from "../testkit/fakes/fake-password-reset-email-sender";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Password reset integration (Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let requestUseCase: RequestPasswordResetUseCase;
  let confirmUseCase: ConfirmPasswordResetUseCase;
  let passwordHasher: BcryptPasswordHasher;
  let emailSender: FakePasswordResetEmailSender;

  const env = {
    WEB_BASE_URL: "http://localhost:8080",
    WEB_PORT: 8080,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: 60,
  } as EnvService;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;

    passwordHasher = new BcryptPasswordHasher();
    emailSender = new FakePasswordResetEmailSender();

    requestUseCase = new RequestPasswordResetUseCase(
      new PrismaUserRepository(prisma),
      new PrismaPasswordResetTokenRepository(prisma),
      emailSender,
      new PrismaUnitOfWork(prisma),
      new SystemClock(),
      new SystemIdGenerator(),
      env
    );

    confirmUseCase = new ConfirmPasswordResetUseCase(
      new PrismaPasswordResetTokenRepository(prisma),
      new PrismaUserRepository(prisma),
      passwordHasher,
      new PrismaUnitOfWork(prisma),
      new SystemClock()
    );
  });

  beforeEach(async () => {
    await db.reset();
    emailSender.sent = [];
  });

  afterAll(async () => {
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("creates a reset token, sends email, and confirms password", async () => {
    const userId = "user-reset-happy";
    const email = "reset-happy@example.com";
    const passwordHash = await passwordHasher.hash("oldpass123");

    await prisma.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
        status: "ACTIVE",
      },
    });

    await requestUseCase.execute({
      email,
      context: buildRequestContext(),
    });

    expect(emailSender.sent).toHaveLength(1);
    const sent = emailSender.sent[0]!;
    const url = new URL(sent.resetUrl);
    const token = url.searchParams.get("token");
    expect(token).toBeTruthy();

    await confirmUseCase.execute({
      token: token!,
      newPassword: "newpass123",
      context: buildRequestContext(),
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(updatedUser).not.toBeNull();
    const valid = await passwordHasher.verify("newpass123", updatedUser!.passwordHash);
    expect(valid).toBe(true);

    const tokenHash = createHash("sha256").update(token!).digest("hex");
    const storedToken = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });
    expect(storedToken?.usedAt).not.toBeNull();
  });

  it("rejects expired reset tokens", async () => {
    const userId = "user-reset-expired";
    const email = "reset-expired@example.com";
    const passwordHash = await passwordHasher.hash("oldpass123");

    await prisma.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
        status: "ACTIVE",
      },
    });

    const rawToken = "expired-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        id: "token-expired",
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await expect(
      confirmUseCase.execute({
        token: rawToken,
        newPassword: "newpass123",
        context: buildRequestContext(),
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
