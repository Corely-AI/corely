import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  PortalOtpRepositoryPort,
  PortalOtpRecord,
} from "../application/ports/portal-otp.port";

@Injectable()
export class PrismaPortalOtpRepository implements PortalOtpRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    tenantId: string;
    workspaceId: string;
    emailNormalized: string;
    codeHash: string;
    expiresAt: Date;
    maxAttempts: number;
    lastSentAt: Date;
  }): Promise<void> {
    await this.prisma.portalOtpCode.create({ data });
  }

  async findLatestActive(
    tenantId: string,
    workspaceId: string,
    emailNormalized: string,
    now: Date
  ): Promise<PortalOtpRecord | null> {
    return this.prisma.portalOtpCode.findFirst({
      where: {
        tenantId,
        workspaceId,
        emailNormalized,
        expiresAt: { gt: now },
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async consume(id: string): Promise<void> {
    await this.prisma.portalOtpCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.portalOtpCode.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
  }

  async invalidateAllForEmail(
    tenantId: string,
    workspaceId: string,
    emailNormalized: string
  ): Promise<void> {
    await this.prisma.portalOtpCode.updateMany({
      where: {
        tenantId,
        workspaceId,
        emailNormalized,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
  }

  async deleteExpired(olderThan: Date): Promise<number> {
    const result = await this.prisma.portalOtpCode.deleteMany({
      where: { expiresAt: { lt: olderThan } },
    });
    return result.count;
  }
}
