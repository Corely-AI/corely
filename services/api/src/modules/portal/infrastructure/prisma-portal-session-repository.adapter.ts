import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  PortalSessionRepositoryPort,
  PortalSessionRecord,
} from "../application/ports/portal-session.port";

@Injectable()
export class PrismaPortalSessionRepository implements PortalSessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    tenantId: string;
    workspaceId: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<void> {
    await this.prisma.portalSession.create({ data });
  }

  async findValidByHash(hash: string): Promise<PortalSessionRecord | null> {
    return this.prisma.portalSession.findFirst({
      where: {
        refreshTokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.portalSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(tenantId: string, workspaceId: string, userId: string): Promise<void> {
    await this.prisma.portalSession.updateMany({
      where: { tenantId, workspaceId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async updateLastUsed(id: string, now: Date): Promise<void> {
    await this.prisma.portalSession.update({
      where: { id },
      data: { lastUsedAt: now },
    });
  }

  async deleteExpiredAndRevoked(olderThan: Date): Promise<number> {
    const result = await this.prisma.portalSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: olderThan } }, { revokedAt: { not: null, lt: olderThan } }],
      },
    });
    return result.count;
  }
}
