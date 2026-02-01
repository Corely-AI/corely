import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const CmsPostStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type CmsPostStatus = z.infer<typeof CmsPostStatusSchema>;

export const CmsCommentStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SPAM",
  "DELETED",
]);
export type CmsCommentStatus = z.infer<typeof CmsCommentStatusSchema>;

export const CmsPostDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  status: CmsPostStatusSchema,
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  coverImageFileId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  contentJson: z.unknown(),
  contentHtml: z.string(),
  contentText: z.string(),
  publishedAt: utcInstantSchema.nullable().optional(),
  authorUserId: z.string(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CmsPostDto = z.infer<typeof CmsPostDtoSchema>;

export const CmsPostSummaryDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  status: CmsPostStatusSchema,
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  coverImageFileId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  publishedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CmsPostSummaryDto = z.infer<typeof CmsPostSummaryDtoSchema>;

export const CmsPublicPostDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  coverImageFileId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  contentHtml: z.string(),
  contentText: z.string(),
  publishedAt: utcInstantSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CmsPublicPostDto = z.infer<typeof CmsPublicPostDtoSchema>;

export const CmsCommentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  postId: z.string(),
  readerId: z.string(),
  parentId: z.string().nullable().optional(),
  bodyText: z.string(),
  status: CmsCommentStatusSchema,
  readerDisplayName: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CmsCommentDto = z.infer<typeof CmsCommentDtoSchema>;

export const CmsReaderDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CmsReaderDto = z.infer<typeof CmsReaderDtoSchema>;
