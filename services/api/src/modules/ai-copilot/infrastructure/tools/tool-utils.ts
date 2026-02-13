import { type UseCaseContext } from "@corely/kernel";

export const validationError = (issues: unknown) => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Invalid input for tool call",
  details: issues,
});

export const buildToolCtx = (params: {
  tenantId: string;
  workspaceId?: string;
  userId: string;
  toolCallId?: string;
  runId?: string;
}): UseCaseContext => ({
  tenantId: params.tenantId,
  workspaceId: params.workspaceId ?? params.tenantId,
  userId: params.userId,
  correlationId: params.toolCallId ?? params.runId,
  requestId: params.toolCallId,
});
