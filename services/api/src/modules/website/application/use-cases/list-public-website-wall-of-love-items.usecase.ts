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
import { buildImageMap } from "./wall-of-love.mapper";

type Deps = {
  logger: LoggerPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
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

    return ok({
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        linkUrl: item.linkUrl ?? undefined,
        imageFileIds: imageMap.get(item.id) ?? [],
        quote: item.quote ?? undefined,
        authorName: item.authorName ?? undefined,
        authorTitle: item.authorTitle ?? undefined,
        sourceLabel: item.sourceLabel ?? undefined,
        order: item.order,
      })),
    });
  }
}
