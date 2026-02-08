import { describe, it, expect, vi } from "vitest";
import {
  generateOtpCode,
  normalizeEmail,
  hashOtpCode,
  verifyOtpCode,
} from "../../portal-otp.utils";
import { PortalRequestCodeUseCase } from "../portal-request-code.usecase";

// ─── OTP Utils ───────────────────────────────────────────

describe("OTP Utils", () => {
  it("generates a 6-digit code", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(code.length).toBe(6);
  });

  it("normalizes email to lowercase trimmed", () => {
    expect(normalizeEmail("  Test@Example.COM  ")).toBe("test@example.com");
  });

  it("hashes codes with HMAC (never stored plaintext)", () => {
    const hash = hashOtpCode("t1", "w1", "test@example.com", "123456");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("123456");
    expect(hash.length).toBe(64);
  });

  it("verifies correct code via constant-time comparison", () => {
    const hash = hashOtpCode("t1", "w1", "test@example.com", "123456");
    expect(verifyOtpCode("t1", "w1", "test@example.com", "123456", hash)).toBe(true);
  });

  it("rejects wrong code", () => {
    const hash = hashOtpCode("t1", "w1", "test@example.com", "123456");
    expect(verifyOtpCode("t1", "w1", "test@example.com", "654321", hash)).toBe(false);
  });

  it("rejects wrong tenant (workspace isolation)", () => {
    const hash = hashOtpCode("t1", "w1", "test@example.com", "123456");
    expect(verifyOtpCode("t2", "w1", "test@example.com", "123456", hash)).toBe(false);
  });

  it("rejects wrong workspace (workspace isolation)", () => {
    const hash = hashOtpCode("t1", "w1", "test@example.com", "123456");
    expect(verifyOtpCode("t1", "w2", "test@example.com", "123456", hash)).toBe(false);
  });
});

// ─── Request Code Use Case ───────────────────────────────

describe("PortalRequestCodeUseCase", () => {
  const createMocks = () => ({
    otpRepo: {
      create: vi.fn(),
      findLatestActive: vi.fn().mockResolvedValue(null),
      consume: vi.fn(),
      incrementAttempts: vi.fn(),
      invalidateAllForEmail: vi.fn(),
      deleteExpired: vi.fn(),
    },
    emailSender: { sendOtpCode: vi.fn() },
    audit: { write: vi.fn() },
    prisma: {
      user: { findFirst: vi.fn() },
      partyRole: { findMany: vi.fn() },
    },
    idGenerator: { newId: vi.fn().mockReturnValue("otp-id-1") },
  });

  it("always returns 200 with generic message (no email enumeration)", async () => {
    const mocks = createMocks();
    mocks.prisma.user.findFirst.mockResolvedValue(null);

    const useCase = new PortalRequestCodeUseCase(
      mocks.otpRepo as any,
      mocks.emailSender as any,
      mocks.audit as any,
      mocks.prisma as any,
      mocks.idGenerator
    );

    const result = await useCase.execute({
      email: "nobody@example.com",
      tenantId: "t1",
      workspaceId: "w1",
    });
    expect(result.message).toContain("login code");
    expect(mocks.emailSender.sendOtpCode).not.toHaveBeenCalled();
  });

  it("sends code when valid portal user exists", async () => {
    const mocks = createMocks();
    mocks.prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      email: "parent@example.com",
      partyId: "p1",
    });
    mocks.prisma.partyRole.findMany.mockResolvedValue([
      { id: "pr1", tenantId: "t1", partyId: "p1", role: "GUARDIAN" },
    ]);

    const useCase = new PortalRequestCodeUseCase(
      mocks.otpRepo as any,
      mocks.emailSender as any,
      mocks.audit as any,
      mocks.prisma as any,
      mocks.idGenerator
    );

    const result = await useCase.execute({
      email: "parent@example.com",
      tenantId: "t1",
      workspaceId: "w1",
    });
    expect(result.message).toContain("login code");
    expect(mocks.emailSender.sendOtpCode).toHaveBeenCalledOnce();
    expect(mocks.otpRepo.invalidateAllForEmail).toHaveBeenCalled();
    expect(mocks.otpRepo.create).toHaveBeenCalled();
    expect(mocks.audit.write).toHaveBeenCalled();
  });

  it("enforces resend cooldown", async () => {
    const mocks = createMocks();
    mocks.prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      partyId: "p1",
    });
    mocks.prisma.partyRole.findMany.mockResolvedValue([
      { id: "pr1", tenantId: "t1", partyId: "p1", role: "STUDENT" },
    ]);
    mocks.otpRepo.findLatestActive.mockResolvedValue({
      id: "old-otp",
      lastSentAt: new Date(Date.now() - 10_000),
    });

    const useCase = new PortalRequestCodeUseCase(
      mocks.otpRepo as any,
      mocks.emailSender as any,
      mocks.audit as any,
      mocks.prisma as any,
      mocks.idGenerator
    );

    const result = await useCase.execute({
      email: "user@example.com",
      tenantId: "t1",
      workspaceId: "w1",
    });
    expect(result.message).toContain("login code");
    expect(mocks.emailSender.sendOtpCode).not.toHaveBeenCalled();
  });
});
