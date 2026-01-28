import { type CmsPostEntity, type CmsPostStatus } from "../../domain/cms-post.entity";

export const CMS_POST_REPOSITORY_PORT = "cms/post-repository";

export type CmsPostListParams = {
  tenantId: string;
  workspaceId: string;
  status?: CmsPostStatus;
  q?: string;
  page: number;
  pageSize: number;
  publishedOnly?: boolean;
};

export interface CmsPostRepositoryPort {
  create(post: CmsPostEntity): Promise<void>;
  save(post: CmsPostEntity): Promise<void>;
  findById(tenantId: string, postId: string): Promise<CmsPostEntity | null>;
  findBySlug(
    tenantId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<CmsPostEntity | null>;
  list(params: CmsPostListParams): Promise<{ items: CmsPostEntity[]; total: number }>;
}
