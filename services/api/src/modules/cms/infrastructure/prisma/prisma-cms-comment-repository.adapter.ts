import { Injectable } from '@nestjs/common';
import { PrismaService } from '@corely/data';
import type { CmsComment, CmsReader, Prisma } from '@prisma/client';
import { CmsCommentEntity } from '../../domain/cms-comment.entity';
import {
 type CmsCommentRepositoryPort,
 type CmsCommentListParams,
} from '../../application/ports/cms-comment-repository.port';

type CmsCommentWithReader = CmsComment & { reader: CmsReader | null };

const mapComment = (row: CmsCommentWithReader): CmsCommentEntity =>
 new CmsCommentEntity({
 id: row.id,
 tenantId: row.tenantId,
 workspaceId: row.workspaceId,
 postId: row.postId,
 readerId: row.readerId,
 parentId: row.parentId,
 bodyText: row.bodyText,
 status: row.status,
 readerDisplayName: row.reader?.displayName ?? null,
 createdAt: row.createdAt,
 updatedAt: row.updatedAt,
 });

@Injectable()
export class PrismaCmsCommentRepository implements CmsCommentRepositoryPort {
 constructor(private readonly prisma: PrismaService) {}

 async create(comment: CmsCommentEntity): Promise<void> {
 await this.prisma.cmsComment.create({
 data: {
 id: comment.id,
 tenantId: comment.tenantId,
 workspaceId: comment.workspaceId,
 postId: comment.postId,
 readerId: comment.readerId,
 parentId: comment.parentId,
 bodyText: comment.bodyText,
 status: comment.status,
 createdAt: comment.createdAt,
 updatedAt: comment.updatedAt,
 },
 });
 }

 async save(comment: CmsCommentEntity): Promise<void> {
 await this.prisma.cmsComment.update({
 where: { id: comment.id },
 data: {
 status: comment.status,
 updatedAt: comment.updatedAt,
 },
 });
 }

 async findById(tenantId: string, commentId: string): Promise<CmsCommentEntity | null> {
 const row = await this.prisma.cmsComment.findFirst({
 where: { id: commentId, tenantId },
 include: { reader: true },
 });
 return row ? mapComment(row) : null;
 }

 async list(params: CmsCommentListParams): Promise<{ items: CmsCommentEntity[]; total: number }> {
 const where: Prisma.CmsCommentWhereInput = {
 tenantId: params.tenantId,
 workspaceId: params.workspaceId,
 };

 if (params.postId) {
 where.postId = params.postId;
 }

 if (params.status) {
 where.status = params.status;
 }

 const total = await this.prisma.cmsComment.count({ where });
 const items = await this.prisma.cmsComment.findMany({
 where,
 include: { reader: true },
 orderBy: { createdAt: 'desc' },
 skip: (params.page - 1) * params.pageSize,
 take: params.pageSize,
 });

 return { items: items.map(mapComment), total };
 }
}
