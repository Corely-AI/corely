export type UseCaseContext = {
  tenantId?: string | null;
  workspaceId?: string | null;
  surfaceId?: string;
  userId?: string;
  correlationId?: string;
  requestId?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
  activeAppId?: string;
};
