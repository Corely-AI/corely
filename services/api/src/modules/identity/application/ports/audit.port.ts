/**
 * Audit Port (Interface)
 * Abstracts audit logging
 */
export interface AuditPort {
  /**
   * Write an audit log
   */
  write(data: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    ip?: string;
    userAgent?: string;
    metadataJson?: string;
    context?: any;
  }): Promise<void>;
}

export const AUDIT_PORT_TOKEN = Symbol("AUDIT_PORT");
