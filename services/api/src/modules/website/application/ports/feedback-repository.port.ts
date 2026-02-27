import type { TransactionContext } from "@corely/kernel";
import type { NormalizedYoutubeVideo } from "../../domain/youtube-url";

export type CreateWebsiteFeedbackRecord = {
  id: string;
  tenantId: string;
  siteId: string;
  pageId?: string | null;
  message: string;
  email?: string | null;
  name?: string | null;
  rating?: number | null;
  youtubeVideos: NormalizedYoutubeVideo[];
  metaJson?: Record<string, unknown> | null;
  createdAt: Date;
  images: Array<{
    id: string;
    tenantId: string;
    fileId: string;
    order: number;
  }>;
};

export interface WebsiteFeedbackRepositoryPort {
  create(record: CreateWebsiteFeedbackRecord, tx?: TransactionContext): Promise<void>;
}

export const WEBSITE_FEEDBACK_REPO_PORT = "website/feedback-repository-port";
