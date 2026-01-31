import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { CmsPost, Prisma } from "@prisma/client";
import { CmsPostEntity } from "../../domain/cms-post.entity";
import {
  type CmsPostRepositoryPort,
  type CmsPostListParams,
} from "../../application/ports/cms-post-repository.port";

const mapPost = (row: CmsPost): CmsPostEntity =>
  new CmsPostEntity({
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    status: row.status,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageFileId: row.coverImageFileId,
    tags: row.tags ?? [],
    contentJson: row.contentJson,
    contentHtml: row.contentHtml,
    contentText: row.contentText,
    publishedAt: row.publishedAt,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

@Injectable()
export class PrismaCmsPostRepository implements CmsPostRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(post: CmsPostEntity): Promise<void> {
    await this.prisma.cmsPost.create({
      data: {
        id: post.id,
        tenantId: post.tenantId,
        workspaceId: post.workspaceId,
        status: post.status,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImageFileId: post.coverImageFileId,
        tags: post.tags ?? [],
        contentJson: post.contentJson as Prisma.InputJsonValue,
        contentHtml: post.contentHtml,
        contentText: post.contentText,
        publishedAt: post.publishedAt,
        authorUserId: post.authorUserId,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  }

  async save(post: CmsPostEntity): Promise<void> {
    await this.prisma.cmsPost.update({
      where: { id: post.id },
      data: {
        status: post.status,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImageFileId: post.coverImageFileId,
        tags: post.tags ?? [],
        contentJson: post.contentJson as Prisma.InputJsonValue,
        contentHtml: post.contentHtml,
        contentText: post.contentText,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
      },
    });
  }

  async findById(tenantId: string, postId: string): Promise<CmsPostEntity | null> {
    const row = await this.prisma.cmsPost.findFirst({ where: { id: postId, tenantId } });
    return row ? mapPost(row) : null;
  }

  async findBySlug(
    tenantId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<CmsPostEntity | null> {
    const where: Prisma.CmsPostWhereInput = { tenantId, slug };
    if (opts?.publishedOnly) {
      where.status = "PUBLISHED";
      where.publishedAt = { not: null };
    }
    const row = await this.prisma.cmsPost.findFirst({ where });
    return row ? mapPost(row) : null;
  }

  async list(params: CmsPostListParams): Promise<{ items: CmsPostEntity[]; total: number }> {
    const where: Prisma.CmsPostWhereInput = {
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
    };

    if (params.publishedOnly) {
      where.status = "PUBLISHED";
      where.publishedAt = { not: null };
    } else if (params.status) {
      where.status = params.status;
    }

    if (params.tag) {
      where.tags = { has: params.tag };
    }

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: "insensitive" } },
        { slug: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const total = await this.prisma.cmsPost.count({ where });
    const items = await this.prisma.cmsPost.findMany({
      where,
      orderBy: params.publishedOnly
        ? [{ publishedAt: "desc" }, { createdAt: "desc" }]
        : [{ updatedAt: "desc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return { items: items.map(mapPost), total };
  }
}
