import type {
  CmsPostDto,
  CmsPostSummaryDto,
  CmsPublicPostDto,
  CmsCommentDto,
  CmsReaderDto,
} from "@corely/contracts";
import { type CmsPostEntity } from "../../domain/cms-post.entity";
import { type CmsCommentEntity } from "../../domain/cms-comment.entity";
import { type CmsReaderEntity } from "../../domain/cms-reader.entity";

export const toCmsPostDto = (post: CmsPostEntity): CmsPostDto => ({
  id: post.id,
  tenantId: post.tenantId,
  workspaceId: post.workspaceId,
  status: post.status,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt ?? null,
  coverImageFileId: post.coverImageFileId ?? null,
  tags: post.tags ?? [],
  contentJson: post.contentJson,
  contentHtml: post.contentHtml,
  contentText: post.contentText,
  publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
  authorUserId: post.authorUserId,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

export const toCmsPostSummaryDto = (post: CmsPostEntity): CmsPostSummaryDto => ({
  id: post.id,
  tenantId: post.tenantId,
  workspaceId: post.workspaceId,
  status: post.status,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt ?? null,
  coverImageFileId: post.coverImageFileId ?? null,
  tags: post.tags ?? [],
  publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

export const toCmsPublicPostDto = (post: CmsPostEntity): CmsPublicPostDto => ({
  id: post.id,
  tenantId: post.tenantId,
  workspaceId: post.workspaceId,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt ?? null,
  coverImageFileId: post.coverImageFileId ?? null,
  tags: post.tags ?? [],
  contentHtml: post.contentHtml,
  contentText: post.contentText,
  publishedAt: post.publishedAt ? post.publishedAt.toISOString() : post.createdAt.toISOString(),
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

export const toCmsCommentDto = (comment: CmsCommentEntity): CmsCommentDto => ({
  id: comment.id,
  tenantId: comment.tenantId,
  workspaceId: comment.workspaceId,
  postId: comment.postId,
  readerId: comment.readerId,
  parentId: comment.parentId ?? null,
  bodyText: comment.bodyText,
  status: comment.status,
  readerDisplayName: comment.readerDisplayName ?? null,
  createdAt: comment.createdAt.toISOString(),
  updatedAt: comment.updatedAt.toISOString(),
});

export const toCmsReaderDto = (reader: CmsReaderEntity): CmsReaderDto => ({
  id: reader.id,
  tenantId: reader.tenantId,
  workspaceId: reader.workspaceId,
  email: reader.email,
  displayName: reader.displayName ?? null,
  createdAt: reader.createdAt.toISOString(),
  updatedAt: reader.updatedAt.toISOString(),
});
