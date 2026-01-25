import type { EnvService } from "@corely/config";
import type { PromptContext, WorkspaceKind } from "@corely/prompts";

export const buildPromptContext = (params: {
  env: EnvService;
  tenantId?: string;
  workspaceKind?: WorkspaceKind;
  environmentOverride?: string;
}): PromptContext => ({
  environment: params.environmentOverride ?? params.env.APP_ENV,
  tenantId: params.tenantId,
  workspaceKind: params.workspaceKind,
});
