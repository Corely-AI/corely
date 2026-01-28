export const WORKSPACE_TAX_SETTINGS_PORT = Symbol("WORKSPACE_TAX_SETTINGS_PORT");

export interface WorkspaceTaxSettingsPort {
  getLegalEntityKind(workspaceId: string): Promise<string | null>;
}
