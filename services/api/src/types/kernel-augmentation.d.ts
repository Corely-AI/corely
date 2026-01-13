import "@corely/kernel";
import "@corely/kernel/dist/index";

declare module "@corely/kernel" {
  interface UseCaseContext {
    tenantId?: string;
    workspaceId?: string | null;
    userId?: string;
    correlationId?: string;
    requestId?: string;
    roles?: string[];
    metadata?: Record<string, unknown>;
  }
}

declare module "@corely/kernel/dist/index" {
  interface UseCaseContext {
    tenantId?: string;
    workspaceId?: string | null;
    userId?: string;
    correlationId?: string;
    requestId?: string;
    roles?: string[];
    metadata?: Record<string, unknown>;
  }
}
