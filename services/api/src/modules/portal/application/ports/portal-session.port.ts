export interface PortalSessionRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
}

export interface PortalSessionRepositoryPort {
  create(data: {
    id: string;
    tenantId: string;
    workspaceId: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<void>;

  findValidByHash(hash: string): Promise<PortalSessionRecord | null>;

  revoke(id: string): Promise<void>;

  revokeAllForUser(tenantId: string, workspaceId: string, userId: string): Promise<void>;

  updateLastUsed(id: string, now: Date): Promise<void>;

  deleteExpiredAndRevoked(olderThan: Date): Promise<number>;
}

export const PORTAL_SESSION_REPOSITORY_TOKEN = "portal/session-repository";
