import { createHmac, randomInt, timingSafeEqual } from "crypto";

const OTP_PEPPER = process.env.PORTAL_OTP_PEPPER || "dev-portal-otp-pepper-change-in-production";

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOtpCode(
  tenantId: string,
  workspaceId: string,
  emailNormalized: string,
  code: string
): string {
  return createHmac("sha256", OTP_PEPPER)
    .update(`${tenantId}:${workspaceId}:${emailNormalized}:${code}`)
    .digest("hex");
}

export function verifyOtpCode(
  tenantId: string,
  workspaceId: string,
  emailNormalized: string,
  code: string,
  storedHash: string
): boolean {
  const candidateHash = hashOtpCode(tenantId, workspaceId, emailNormalized, code);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export const PORTAL_OTP_TTL_MINUTES = parseInt(process.env.PORTAL_OTP_TTL_MINUTES || "10", 10);
export const PORTAL_OTP_MAX_ATTEMPTS = parseInt(process.env.PORTAL_OTP_MAX_ATTEMPTS || "5", 10);
export const PORTAL_OTP_RESEND_COOLDOWN_SECONDS = parseInt(
  process.env.PORTAL_OTP_RESEND_COOLDOWN_SECONDS || "60",
  10
);
export const PORTAL_REFRESH_TTL_DAYS = parseInt(process.env.PORTAL_REFRESH_TTL_DAYS || "30", 10);
