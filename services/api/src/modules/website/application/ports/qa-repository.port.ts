export type WebsiteQaScope = "site" | "page";
export type WebsiteQaStatus = "draft" | "published";

export type WebsiteQaItem = {
  id: string;
  tenantId: string;
  siteId: string;
  locale: string;
  scope: WebsiteQaScope;
  pageId?: string | null;
  status: WebsiteQaStatus;
  order: number;
  question: string;
  answerHtml: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicWebsiteQaItem = Pick<
  WebsiteQaItem,
  "id" | "question" | "answerHtml" | "order" | "updatedAt" | "locale"
>;

export type ListWebsiteQaForSiteParams = {
  tenantId: string;
  siteId: string;
  locale?: string;
  scope?: WebsiteQaScope;
  pageId?: string;
  status?: WebsiteQaStatus;
};

export type ListPublishedWebsiteQaParams = {
  tenantId: string;
  siteId: string;
  locale: string;
  scope: WebsiteQaScope;
  pageId?: string | null;
};

export type CreateWebsiteQaRecord = {
  id: string;
  tenantId: string;
  siteId: string;
  locale: string;
  scope: WebsiteQaScope;
  pageId?: string | null;
  status: WebsiteQaStatus;
  order: number;
  question: string;
  answerHtml: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateWebsiteQaRecord = WebsiteQaItem;

export interface WebsiteQaRepositoryPort {
  listPublished(params: ListPublishedWebsiteQaParams): Promise<PublicWebsiteQaItem[]>;
  listForSite(params: ListWebsiteQaForSiteParams): Promise<WebsiteQaItem[]>;
  findById(tenantId: string, siteId: string, qaId: string): Promise<WebsiteQaItem | null>;
  create(record: CreateWebsiteQaRecord): Promise<WebsiteQaItem>;
  update(record: UpdateWebsiteQaRecord): Promise<WebsiteQaItem>;
  delete(tenantId: string, siteId: string, qaId: string): Promise<void>;
}

export const WEBSITE_QA_REPO_PORT = "website/qa-repository-port";
