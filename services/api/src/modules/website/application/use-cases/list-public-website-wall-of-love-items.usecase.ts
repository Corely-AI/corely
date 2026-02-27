import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type {
  ListPublicWebsiteWallOfLoveItemsInput,
  ListPublicWebsiteWallOfLoveItemsOutput,
} from "@corely/contracts";
import type { WebsiteWallOfLoveRepositoryPort } from "../ports/wall-of-love-repository.port";
import type { WebsiteWallOfLoveImagesRepositoryPort } from "../ports/wall-of-love-images-repository.port";
import type { WebsitePublicFileUrlPort } from "../ports/public-file-url.port";
import { buildImageMap } from "./wall-of-love.mapper";

type Deps = {
  logger: LoggerPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
  publicFileUrlPort: WebsitePublicFileUrlPort;
};

export class ListPublicWebsiteWallOfLoveItemsUseCase extends BaseUseCase<
  ListPublicWebsiteWallOfLoveItemsInput,
  ListPublicWebsiteWallOfLoveItemsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListPublicWebsiteWallOfLoveItemsInput,
    _ctx: UseCaseContext
  ): Promise<Result<ListPublicWebsiteWallOfLoveItemsOutput, UseCaseError>> {
    const items = await this.deps.wallOfLoveRepo.listPublishedBySiteId(input.siteId);
    if (items.length === 0) {
      return ok({ items: [] });
    }

    const tenantId = items[0]!.tenantId;
    const images = await this.deps.wallOfLoveImagesRepo.listByItemIds(
      tenantId,
      items.map((item) => item.id)
    );
    const imageMap = buildImageMap(images);
    const imageFileIds = Array.from(
      new Set(
        items.filter((item) => item.type === "image").flatMap((item) => imageMap.get(item.id) ?? [])
      )
    );

    const resolvedUrls = await Promise.all(
      imageFileIds.map(async (fileId) => ({
        fileId,
        url: await this.deps.publicFileUrlPort.getPublicUrl(fileId),
      }))
    );
    const imageUrlByFileId = new Map(
      resolvedUrls
        .filter((entry): entry is { fileId: string; url: string } => entry.url !== null)
        .map((entry) => [entry.fileId, entry.url])
    );

    return ok({
      items: items.map((item) => ({
        imageFileId: item.type === "image" ? (imageMap.get(item.id) ?? [])[0] : undefined,
        imageUrl:
          item.type === "image"
            ? (() => {
                const fileId = (imageMap.get(item.id) ?? [])[0];
                if (!fileId) {
                  return undefined;
                }
                return imageUrlByFileId.get(fileId) ?? `/public/documents/files/${fileId}`;
              })()
            : undefined,
        id: item.id,
        type: item.type,
        linkUrl: item.linkUrl ?? undefined,
        quote: item.quote ?? undefined,
        authorName: item.authorName ?? undefined,
        authorTitle: item.authorTitle ?? undefined,
        sourceLabel: item.sourceLabel ?? undefined,
        order: item.order,
      })),
    });
  }
}
