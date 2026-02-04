export type UseCaseContext = {
  tenantId?: string | null;
  workspaceId?: string | null;
  userId?: string;
  correlationId?: string;
  requestId?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
};
