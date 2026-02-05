export type CmsReadMode = "live" | "preview";

export type CmsRenderPayload = {
  entryId: string;
  title: string;
  excerpt: string | null;
  contentJson: unknown;
  contentHtml: string;
  contentText: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
};

export interface CmsReadPort {
  getEntryForWebsiteRender(params: {
    tenantId: string;
    entryId: string;
    locale?: string;
    mode: CmsReadMode;
  }): Promise<CmsRenderPayload>;
}

export const CMS_READ_PORT = "website/cms-read-port";
