export interface PortalOtpRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  emailNormalized: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attemptCount: number;
  maxAttempts: number;
  lastSentAt: Date;
  createdAt: Date;
}

export interface PortalOtpRepositoryPort {
  create(data: {
    id: string;
    tenantId: string;
    workspaceId: string;
    emailNormalized: string;
    codeHash: string;
    expiresAt: Date;
    maxAttempts: number;
    lastSentAt: Date;
  }): Promise<void>;

  findLatestActive(
    tenantId: string,
    workspaceId: string,
    emailNormalized: string,
    now: Date
  ): Promise<PortalOtpRecord | null>;

  consume(id: string): Promise<void>;

  incrementAttempts(id: string): Promise<void>;

  invalidateAllForEmail(
    tenantId: string,
    workspaceId: string,
    emailNormalized: string
  ): Promise<void>;

  deleteExpired(olderThan: Date): Promise<number>;
}

export const PORTAL_OTP_REPOSITORY_TOKEN = "portal/otp-repository";
