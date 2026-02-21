import type { WebsitePageBlueprint } from "@corely/contracts";

export interface CmsWritePort {
  createDraftEntryFromBlueprint(params: {
    tenantId: string;
    workspaceId?: string | null;
    authorUserId?: string | null;
    locale: string;
    blueprint: WebsitePageBlueprint;
  }): Promise<{ entryId: string }>;

  updateDraftEntryContentJson(params: {
    tenantId: string;
    workspaceId?: string | null;
    entryId: string;
    contentJson: unknown;
  }): Promise<void>;
}

export const CMS_WRITE_PORT = "website/cms-write-port";
