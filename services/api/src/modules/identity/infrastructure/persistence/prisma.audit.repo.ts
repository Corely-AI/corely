import { Injectable } from '@nestjs/common';
import { prisma } from '@kerniflow/data';
import { IAuditPort } from '../../application/ports/audit.port';

/**
 * Prisma Audit Repository Implementation
 */
@Injectable()
export class PrismaAuditRepository implements IAuditPort {
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
    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        actorUserId: data.actorUserId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        ip: data.ip,
        userAgent: data.userAgent,
        metadataJson: data.metadataJson
      }
    });
  }
}
