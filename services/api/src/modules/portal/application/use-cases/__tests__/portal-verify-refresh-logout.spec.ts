import { describe, it, expect, vi } from "vitest";
import { hashOtpCode } from "../../portal-otp.utils";
import { PortalVerifyCodeUseCase } from "../portal-verify-code.usecase";
import { PortalRefreshUseCase } from "../portal-refresh.usecase";
import { PortalLogoutUseCase } from "../portal-logout.usecase";
import { createHash, randomUUID } from "crypto";

// ─── Verify Code Use Case ────────────────────────────────

describe("PortalVerifyCodeUseCase", () => {
  const createMocks = () => {
    const code = "123456";
    const codeHash = hashOtpCode("t1", "w1", "user@example.com", code);

    return {
      code,
      otpRepo: {
        findLatestActive: vi.fn().mockResolvedValue({
          id: "otp-1",
          tenantId: "t1",
          workspaceId: "w1",
          emailNormalized: "user@example.com",
          codeHash,
          expiresAt: new Date(Date.now() + 600_000),
          consumedAt: null,
          attemptCount: 0,
          maxAttempts: 5,
        }),
        consume: vi.fn(),
        incrementAttempts: vi.fn(),
        invalidateAllForEmail: vi.fn(),
        create: vi.fn(),
        deleteExpired: vi.fn(),
      },
      sessionRepo: {
        create: vi.fn(),
        findValidByHash: vi.fn(),
        revoke: vi.fn(),
        revokeAllForUser: vi.fn(),
        updateLastUsed: vi.fn(),
        deleteExpiredAndRevoked: vi.fn(),
      },
      tokenService: {
        generateAccessToken: vi.fn().mockReturnValue("access-token-123"),
        generateRefreshToken: vi.fn().mockReturnValue("refresh-token-123"),
        getExpirationTimes: vi
          .fn()
          .mockReturnValue({ accessTokenExpiresIn: "15m", refreshTokenExpiresInMs: 30 * 86400000 }),
        verifyAccessToken: vi.fn(),
      },
      audit: { write: vi.fn() },
      prisma: {
        user: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "u1", email: "user@example.com", partyId: "p1" }),
        },
        party: { findFirst: vi.fn().mockResolvedValue({ id: "p1", displayName: "Jane Doe" }) },
        partyRole: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "pr1", tenantId: "t1", partyId: "p1", role: "GUARDIAN" }]),
        },
        membership: { findFirst: vi.fn().mockResolvedValue({ id: "m1", roleId: "role-1" }) },
      },
      idGenerator: { newId: vi.fn().mockReturnValue("session-1") },
    };
  };

  const buildUseCase = (mocks: ReturnType<typeof createMocks>) =>
    new PortalVerifyCodeUseCase(
      mocks.otpRepo as any,
      mocks.sessionRepo as any,
      mocks.tokenService as any,
      mocks.audit as any,
      mocks.prisma as any,
      mocks.idGenerator
    );

  it("creates session and returns tokens on correct code", async () => {
    const mocks = createMocks();
    const result = await buildUseCase(mocks).execute({
      email: "user@example.com",
      code: mocks.code,
      tenantId: "t1",
      workspaceId: "w1",
    });

    expect(result.accessToken).toBe("access-token-123");
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.role).toBe("GUARDIAN");
    expect(result.user.displayName).toBe("Jane Doe");
    expect(mocks.otpRepo.consume).toHaveBeenCalledWith("otp-1");
    expect(mocks.sessionRepo.create).toHaveBeenCalled();
    expect(mocks.audit.write).toHaveBeenCalled();
  });

  it("increments attempts on wrong code and rejects", async () => {
    const mocks = createMocks();
    await expect(
      buildUseCase(mocks).execute({
        email: "user@example.com",
        code: "999999",
        tenantId: "t1",
        workspaceId: "w1",
      })
    ).rejects.toThrow("Invalid or expired code");
    expect(mocks.otpRepo.incrementAttempts).toHaveBeenCalledWith("otp-1");
    expect(mocks.otpRepo.consume).not.toHaveBeenCalled();
  });

  it("rejects when max attempts reached", async () => {
    const mocks = createMocks();
    mocks.otpRepo.findLatestActive.mockResolvedValue({
      id: "otp-1",
      attemptCount: 5,
      maxAttempts: 5,
      codeHash: "anything",
      expiresAt: new Date(Date.now() + 600_000),
      consumedAt: null,
    });
    await expect(
      buildUseCase(mocks).execute({
        email: "user@example.com",
        code: "123456",
        tenantId: "t1",
        workspaceId: "w1",
      })
    ).rejects.toThrow("Invalid or expired code");
    expect(mocks.otpRepo.incrementAttempts).not.toHaveBeenCalled();
  });

  it("prefers GUARDIAN when both roles exist (shared email)", async () => {
    const mocks = createMocks();
    mocks.prisma.partyRole.findMany.mockResolvedValue([
      { id: "pr1", tenantId: "t1", partyId: "p1", role: "GUARDIAN" },
      { id: "pr2", tenantId: "t1", partyId: "p1", role: "STUDENT" },
    ]);
    const result = await buildUseCase(mocks).execute({
      email: "user@example.com",
      code: mocks.code,
      tenantId: "t1",
      workspaceId: "w1",
    });
    expect(result.user.role).toBe("GUARDIAN");
  });

  it("selects STUDENT when only STUDENT role exists", async () => {
    const mocks = createMocks();
    mocks.prisma.partyRole.findMany.mockResolvedValue([
      { id: "pr1", tenantId: "t1", partyId: "p1", role: "STUDENT" },
    ]);
    const result = await buildUseCase(mocks).execute({
      email: "user@example.com",
      code: mocks.code,
      tenantId: "t1",
      workspaceId: "w1",
    });
    expect(result.user.role).toBe("STUDENT");
  });

  it("rejects when no OTP found (expired/missing)", async () => {
    const mocks = createMocks();
    mocks.otpRepo.findLatestActive.mockResolvedValue(null);
    await expect(
      buildUseCase(mocks).execute({
        email: "user@example.com",
        code: "123456",
        tenantId: "t1",
        workspaceId: "w1",
      })
    ).rejects.toThrow("Invalid or expired code");
  });
});

// ─── Refresh Use Case ────────────────────────────────────

describe("PortalRefreshUseCase", () => {
  it("rotates tokens on valid refresh", async () => {
    const refreshToken = randomUUID();
    const mocks = {
      sessionRepo: {
        findValidByHash: vi.fn().mockResolvedValue({
          id: "s1",
          tenantId: "t1",
          workspaceId: "w1",
          userId: "u1",
          expiresAt: new Date(Date.now() + 86400000),
          revokedAt: null,
          userAgent: null,
          ip: null,
        }),
        revoke: vi.fn(),
        create: vi.fn(),
      },
      tokenService: {
        generateAccessToken: vi.fn().mockReturnValue("new-access"),
        generateRefreshToken: vi.fn(),
        getExpirationTimes: vi.fn(),
        verifyAccessToken: vi.fn(),
      },
      audit: { write: vi.fn() },
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue({ id: "u1", email: "user@example.com" }) },
        membership: { findFirst: vi.fn().mockResolvedValue({ id: "m1", roleId: "role-1" }) },
      },
      idGenerator: { newId: vi.fn().mockReturnValue("new-session") },
    };

    const useCase = new PortalRefreshUseCase(
      mocks.sessionRepo as any,
      mocks.tokenService as any,
      mocks.audit as any,
      mocks.prisma as any,
      mocks.idGenerator
    );

    const result = await useCase.execute({ refreshToken });
    expect(result.accessToken).toBe("new-access");
    expect(result.refreshToken).toBeTruthy();
    expect(mocks.sessionRepo.revoke).toHaveBeenCalledWith("s1");
    expect(mocks.sessionRepo.create).toHaveBeenCalled();
  });
});

// ─── Logout Use Case ─────────────────────────────────────

describe("PortalLogoutUseCase", () => {
  it("revokes session and audits", async () => {
    const refreshToken = randomUUID();
    const mocks = {
      sessionRepo: {
        findValidByHash: vi
          .fn()
          .mockResolvedValue({ id: "s1", tenantId: "t1", workspaceId: "w1", userId: "u1" }),
        revoke: vi.fn(),
      },
      audit: { write: vi.fn() },
    };

    const useCase = new PortalLogoutUseCase(mocks.sessionRepo as any, mocks.audit as any);
    const result = await useCase.execute({ refreshToken });

    expect(result.message).toBe("Logged out");
    expect(mocks.sessionRepo.revoke).toHaveBeenCalledWith("s1");
    expect(mocks.audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: "portal.logout" })
    );
  });
});
