import { describe, it, expect, beforeEach } from "vitest";
import { SignOutUseCase } from "../sign-out.usecase";
import { FakeRefreshTokenRepository } from "../../../testkit/fakes/fake-refresh-token-repo";
import { MockOutbox } from "../../../testkit/mocks/mock-outbox";
import { MockAudit } from "../../../testkit/mocks/mock-audit";

let useCase: SignOutUseCase;
let refreshRepo: FakeRefreshTokenRepository;
let outbox: MockOutbox;
let audit: MockAudit;

beforeEach(() => {
  refreshRepo = new FakeRefreshTokenRepository();
  outbox = new MockOutbox();
  audit = new MockAudit();
  useCase = new SignOutUseCase(refreshRepo, outbox, audit);
});

describe("SignOutUseCase", () => {
  it("revokes refresh tokens and records audit", async () => {
    await refreshRepo.create({
      id: "rt-1",
      userId: "user-1",
      tenantId: "tenant-1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 10_000),
    });

    await useCase.execute({ userId: "user-1", tenantId: "tenant-1" });

    expect(refreshRepo.tokens[0].revokedAt).not.toBeNull();
    expect(outbox.events).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });
});
