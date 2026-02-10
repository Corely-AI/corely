import type { WebsitePageBlueprint } from "@corely/contracts";

export interface CmsWritePort {
  createDraftEntryFromBlueprint(params: {
    tenantId: string;
    workspaceId?: string | null;
    authorUserId?: string | null;
    locale: string;
    blueprint: WebsitePageBlueprint;
  }): Promise<{ entryId: string }>;
}

export const CMS_WRITE_PORT = "website/cms-write-port";
