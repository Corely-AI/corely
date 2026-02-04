import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "crypto";
import { ConfirmPasswordResetUseCase } from "../confirm-password-reset.usecase";
import { FakePasswordResetTokenRepository } from "../../../testkit/fakes/fake-password-reset-token-repo";
import { FakeUserRepository } from "../../../testkit/fakes/fake-user-repo";
import { MockPasswordHasher } from "../../../testkit/mocks/mock-password-hasher";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { User } from "../../../domain/entities/user.entity";
import { Email } from "../../../domain/value-objects/email.vo";
import { buildRequestContext } from "@shared/context/request-context";
import type { TransactionContext, UnitOfWorkPort } from "@corely/kernel";
import { ValidationError } from "@corely/kernel";

let useCase: ConfirmPasswordResetUseCase;
let resetRepo: FakePasswordResetTokenRepository;
let userRepo: FakeUserRepository;
let passwordHasher: MockPasswordHasher;

const now = new Date("2023-01-01T00:00:00.000Z");
const clock = new FakeClock(now);
const uow: UnitOfWorkPort = {
  withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
    fn({} as TransactionContext),
};

beforeEach(async () => {
  resetRepo = new FakePasswordResetTokenRepository();
  userRepo = new FakeUserRepository();
  passwordHasher = new MockPasswordHasher();

  const email = Email.create("user@example.com");
  await userRepo.create(User.create("user-1", email, "hashed:old", null));

  useCase = new ConfirmPasswordResetUseCase(resetRepo, userRepo, passwordHasher, uow, clock);
});

describe("ConfirmPasswordResetUseCase", () => {
  it("updates password and marks token used", async () => {
    const rawToken = "reset-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await resetRepo.create({
      id: "token-1",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    const result = await useCase.execute({
      token: rawToken,
      newPassword: "newpassword",
      context: buildRequestContext(),
    });

    expect(result.ok).toBe(true);
    const updated = await userRepo.findById("user-1");
    expect(updated?.getPasswordHash()).toBe("hashed:newpassword");

    const stored = await resetRepo.findByHash(tokenHash);
    expect(stored?.usedAt).not.toBeNull();
  });

  it("rejects invalid tokens", async () => {
    await expect(
      useCase.execute({
        token: "bad-token",
        newPassword: "newpassword",
        context: buildRequestContext(),
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects expired tokens", async () => {
    const rawToken = "expired-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await resetRepo.create({
      id: "token-expired",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(now.getTime() - 1000),
    });

    await expect(
      useCase.execute({
        token: rawToken,
        newPassword: "newpassword",
        context: buildRequestContext(),
      })
    ).rejects.toBeInstanceOf(ValidationError);

    const updated = await userRepo.findById("user-1");
    expect(updated?.getPasswordHash()).toBe("hashed:old");
  });

  it("rejects used tokens", async () => {
    const rawToken = "used-token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await resetRepo.create({
      id: "token-used",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    });
    await resetRepo.markUsed("token-used", new Date(now.getTime() - 500));

    await expect(
      useCase.execute({
        token: rawToken,
        newPassword: "newpassword",
        context: buildRequestContext(),
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
