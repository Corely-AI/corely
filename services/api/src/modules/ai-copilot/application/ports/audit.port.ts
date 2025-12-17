export interface AuditPort {
  write(data: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: string;
  }): Promise<void>;
}
