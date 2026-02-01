import { type RichTextPresetId, RichTextAiOperation } from "@corely/contracts";

export interface RichTextAiConfig {
  presetId: RichTextPresetId;
  allowedTags: string[];
  allowLinks: boolean;
  entityContext?: {
    module: string;
    entityType: string;
    entityId?: string;
    workspaceId?: string;
    tenantId?: string;
  };
}

export interface RichTextAiState {
  isOpen: boolean;
  isLoading: boolean;
  error?: string;
}
