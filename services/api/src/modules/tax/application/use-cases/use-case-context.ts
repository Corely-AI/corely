export interface UseCaseContext {
  tenantId: string;
  workspaceId: string;
  userId: string;
  correlationId?: string;
  idempotencyKey?: string;
}
