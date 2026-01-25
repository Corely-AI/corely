import { type z } from "zod";

export type PromptEnvironment = "dev" | "stage" | "prod" | "test" | string;
export type WorkspaceKind = "PERSONAL" | "COMPANY";

export interface PromptContext {
  environment: PromptEnvironment;
  workspaceKind?: WorkspaceKind;
  tenantId?: string;
}

export type PromptVariableKind = "text" | "block" | "json";

export interface PromptVariableDefinition {
  key: string;
  kind?: PromptVariableKind;
  description?: string;
}

export interface PromptVersionDefinition {
  version: string;
  template: string;
  variablesSchema: z.ZodTypeAny;
  variables?: PromptVariableDefinition[];
  description?: string;
  tags?: string[];
}

export interface PromptSelectionRule {
  when: {
    environments?: PromptEnvironment[];
    workspaceKinds?: WorkspaceKind[];
    tenantIds?: string[];
  };
  version: string;
  priority?: number;
}

export interface PromptDefinition {
  id: string;
  description: string;
  defaultVersion: string;
  versions: PromptVersionDefinition[];
  selection?: PromptSelectionRule[];
  tags?: string[];
}

export interface PromptResolvedDefinition {
  definition: PromptDefinition;
  version: PromptVersionDefinition;
  promptHash: string;
}

export interface PromptRenderResult {
  promptId: string;
  promptVersion: string;
  promptHash: string;
  renderEngineVersion: string;
  template: string;
  content: string;
  variables: Record<string, unknown>;
}

export interface PromptProviderPort {
  get(id: string, context: PromptContext): PromptDefinition | undefined;
  list?(context?: PromptContext): PromptDefinition[];
}
