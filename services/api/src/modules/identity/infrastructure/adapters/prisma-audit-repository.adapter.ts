import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { AuditPort } from "../../application/ports/audit.port";

/**
 * Prisma Audit Repository Implementation
 */
@Injectable()
export class PrismaAuditRepository implements AuditPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async write(data: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    ip?: string;
    userAgent?: string;
    metadataJson?: string;
  }): Promise<void> {
    const details: Record<string, unknown> = {};
    if (data.actorUserId) {
      details.actorUserId = data.actorUserId;
    }
    if (data.ip) {
      details.ip = data.ip;
    }
    if (data.userAgent) {
      details.userAgent = data.userAgent;
    }
    if (data.metadataJson) {
      details.metadata = data.metadataJson;
    }

    const createData: any = {
      action: data.action,
      // Map target fields to the required Prisma columns
      entity: data.targetType || "Unknown",
      entityId: data.targetId || data.actorUserId || "unknown",
    };

    if (data.tenantId) {
      createData.tenantId = data.tenantId;
    }
    if (Object.keys(details).length > 0) {
      createData.details = JSON.stringify(details);
    }

    await this.prisma.auditLog.create({ data: createData });
  }
}
