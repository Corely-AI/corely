export type UseCaseContext = {
  tenantId?: string;
  workspaceId?: string | null;
  userId?: string;
  correlationId?: string;
  requestId?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
};
