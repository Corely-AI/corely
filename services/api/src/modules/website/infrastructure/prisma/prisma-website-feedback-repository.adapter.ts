import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { Prisma } from "@prisma/client";
import type {
  CreateWebsiteFeedbackRecord,
  WebsiteFeedbackRepositoryPort,
} from "../../application/ports/feedback-repository.port";

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class PrismaWebsiteFeedbackRepository implements WebsiteFeedbackRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: CreateWebsiteFeedbackRecord, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as unknown as TransactionContext);

    await client.websiteFeedback.create({
      data: {
        id: record.id,
        tenantId: record.tenantId,
        siteId: record.siteId,
        pageId: record.pageId ?? null,
        message: record.message,
        email: record.email ?? null,
        name: record.name ?? null,
        rating: record.rating ?? null,
        youtubeJson: toJsonValue(record.youtubeVideos),
        metaJson:
          record.metaJson === null
            ? Prisma.DbNull
            : record.metaJson
              ? toJsonValue(record.metaJson)
              : undefined,
        createdAt: record.createdAt,
        images:
          record.images.length > 0
            ? {
                create: record.images.map((image) => ({
                  id: image.id,
                  tenantId: image.tenantId,
                  fileId: image.fileId,
                  order: image.order,
                })),
              }
            : undefined,
      },
    });
  }
}
