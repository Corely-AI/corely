import { type CmsCommentEntity, type CmsCommentStatus } from '../../domain/cms-comment.entity';

export const CMS_COMMENT_REPOSITORY_PORT = 'cms/comment-repository';

export type CmsCommentListParams = {
 tenantId: string;
 workspaceId: string;
 postId?: string;
 status?: CmsCommentStatus;
 page: number;
 pageSize: number;
};

export interface CmsCommentRepositoryPort {
 create(comment: CmsCommentEntity): Promise<void>;
 save(comment: CmsCommentEntity): Promise<void>;
 findById(tenantId: string, commentId: string): Promise<CmsCommentEntity | null>;
 list(params: CmsCommentListParams): Promise<{ items: CmsCommentEntity[]; total: number }>;
}
