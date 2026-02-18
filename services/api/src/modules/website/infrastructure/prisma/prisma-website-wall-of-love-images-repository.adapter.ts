import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  WebsiteWallOfLoveImageRecord,
  WebsiteWallOfLoveImagesRepositoryPort,
} from "../../application/ports/wall-of-love-images-repository.port";

@Injectable()
export class PrismaWebsiteWallOfLoveImagesRepository implements WebsiteWallOfLoveImagesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByItemIds(
    tenantId: string,
    itemIds: string[]
  ): Promise<WebsiteWallOfLoveImageRecord[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.websiteWallOfLoveItemImage.findMany({
      where: {
        tenantId,
        itemId: { in: itemIds },
      },
      orderBy: [{ itemId: "asc" }, { order: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      itemId: row.itemId,
      fileId: row.fileId,
      order: row.order,
    }));
  }

  async replaceForItem(
    tenantId: string,
    itemId: string,
    images: WebsiteWallOfLoveImageRecord[]
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.websiteWallOfLoveItemImage.deleteMany({
        where: {
          tenantId,
          itemId,
        },
      });

      if (images.length > 0) {
        await tx.websiteWallOfLoveItemImage.createMany({
          data: images.map((image) => ({
            id: image.id,
            tenantId: image.tenantId,
            itemId: image.itemId,
            fileId: image.fileId,
            order: image.order,
          })),
        });
      }
    });
  }
}
