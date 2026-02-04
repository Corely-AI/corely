import { describe, it, expect, beforeEach } from "vitest";
import { RequestPasswordResetUseCase } from "../request-password-reset.usecase";
import { FakeUserRepository } from "../../../testkit/fakes/fake-user-repo";
import { FakePasswordResetTokenRepository } from "../../../testkit/fakes/fake-password-reset-token-repo";
import { FakePasswordResetEmailSender } from "../../../testkit/fakes/fake-password-reset-email-sender";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { User } from "../../../domain/entities/user.entity";
import { Email } from "../../../domain/value-objects/email.vo";
import { buildRequestContext } from "@shared/context/request-context";
import type { EnvService } from "@corely/config";
import type { TransactionContext, UnitOfWorkPort } from "@corely/kernel";

let useCase: RequestPasswordResetUseCase;
let userRepo: FakeUserRepository;
let resetRepo: FakePasswordResetTokenRepository;
let emailSender: FakePasswordResetEmailSender;

const clock = new FakeClock(new Date("2023-01-01T00:00:00.000Z"));
const uow: UnitOfWorkPort = {
  withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
    fn({} as TransactionContext),
};
const env = {
  WEB_BASE_URL: "http://localhost:8080",
  WEB_PORT: 8080,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: 60,
} as EnvService;

beforeEach(() => {
  userRepo = new FakeUserRepository();
  resetRepo = new FakePasswordResetTokenRepository();
  emailSender = new FakePasswordResetEmailSender();

  useCase = new RequestPasswordResetUseCase(
    userRepo,
    resetRepo,
    emailSender,
    uow,
    clock,
    new FakeIdGenerator("id"),
    env
  );
});

describe("RequestPasswordResetUseCase", () => {
  it("returns ok even when user does not exist", async () => {
    const result = await useCase.execute({
      email: "missing@example.com",
      context: buildRequestContext(),
    });

    expect(result.ok).toBe(true);
    expect(resetRepo.tokens).toHaveLength(0);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("creates a token, invalidates older ones, and sends a reset email", async () => {
    const email = Email.create("user@example.com");
    await userRepo.create(User.create("user-1", email, "hash", null));

    await resetRepo.create({
      id: "token-old",
      userId: "user-1",
      tokenHash: "hash-old",
      expiresAt: new Date("2023-01-01T01:00:00.000Z"),
    });

    const result = await useCase.execute({
      email: "user@example.com",
      context: buildRequestContext({ tenantId: "tenant-1", requestId: "req-1" }),
    });

    expect(result.ok).toBe(true);
    expect(resetRepo.tokens).toHaveLength(2);

    const oldToken = resetRepo.tokens.find((t) => t.id === "token-old");
    const newToken = resetRepo.tokens.find((t) => t.id !== "token-old");
    expect(oldToken?.usedAt).not.toBeNull();
    expect(newToken?.usedAt).toBeNull();

    expect(emailSender.sent).toHaveLength(1);
    const sent = emailSender.sent[0]!;
    expect(sent.to).toBe("user@example.com");
    expect(sent.tenantId).toBe("tenant-1");
    expect(sent.correlationId).toBe("req-1");
    expect(sent.resetUrl).toContain("/auth/reset-password?token=");
  });
});
