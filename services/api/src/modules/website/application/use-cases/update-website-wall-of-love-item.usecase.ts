import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type {
  UpdateWebsiteWallOfLoveItemInput,
  WebsiteWallOfLoveUpsertOutput,
} from "@corely/contracts";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { WebsiteWallOfLoveRepositoryPort } from "../ports/wall-of-love-repository.port";
import type {
  WebsiteWallOfLoveImageRecord,
  WebsiteWallOfLoveImagesRepositoryPort,
} from "../ports/wall-of-love-images-repository.port";
import { assertWebsiteWrite } from "../../policies/website.policies";
import { normalizeWallOfLoveLink } from "../../domain/wall-of-love-links";
import { toWebsiteWallOfLoveItemDto } from "./wall-of-love.mapper";

type Deps = {
  logger: LoggerPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
  clock: ClockPort;
  idGenerator: IdGeneratorPort;
};

const normalizeImageFileIds = (rawIds: string[] | undefined): string[] => {
  if (!rawIds) {
    return [];
  }
  return Array.from(new Set(rawIds.map((id) => id.trim()).filter(Boolean))).slice(0, 1);
};

@RequireTenant()
export class UpdateWebsiteWallOfLoveItemUseCase extends BaseUseCase<
  { itemId: string; input: UpdateWebsiteWallOfLoveItemInput },
  WebsiteWallOfLoveUpsertOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    params: { itemId: string; input: UpdateWebsiteWallOfLoveItemInput },
    ctx: UseCaseContext
  ): Promise<Result<WebsiteWallOfLoveUpsertOutput, UseCaseError>> {
    assertWebsiteWrite(ctx);

    const tenantId = ctx.tenantId!;
    const existing = await this.deps.wallOfLoveRepo.findById(tenantId, params.itemId);
    if (!existing) {
      return err(
        new NotFoundError("Wall of Love item not found", undefined, "Website:WallOfLoveNotFound")
      );
    }

    const existingImages = await this.deps.wallOfLoveImagesRepo.listByItemIds(tenantId, [
      existing.id,
    ]);
    const currentImageFileIds = existingImages
      .sort((a, b) => a.order - b.order)
      .map((image) => image.fileId)
      .slice(0, 1);

    const input = params.input;
    const nextType = input.type ?? existing.type;

    let nextLinkUrl: string | null = existing.linkUrl ?? null;
    if (input.linkUrl !== undefined) {
      nextLinkUrl =
        input.linkUrl === null
          ? normalizeWallOfLoveLink(nextType, null)
          : normalizeWallOfLoveLink(nextType, input.linkUrl);
    } else if (input.type !== undefined) {
      nextLinkUrl = normalizeWallOfLoveLink(nextType, existing.linkUrl ?? null);
    }

    const nextImageFileIds =
      input.imageFileIds !== undefined
        ? normalizeImageFileIds(input.imageFileIds)
        : currentImageFileIds;

    const updated = await this.deps.wallOfLoveRepo.update({
      ...existing,
      type: nextType,
      quote: input.quote === undefined ? existing.quote : input.quote,
      authorName: input.authorName === undefined ? existing.authorName : input.authorName,
      authorTitle: input.authorTitle === undefined ? existing.authorTitle : input.authorTitle,
      sourceLabel: input.sourceLabel === undefined ? existing.sourceLabel : input.sourceLabel,
      linkUrl: nextLinkUrl,
      updatedAt: this.deps.clock.now().toISOString(),
    });

    if (input.imageFileIds !== undefined) {
      const images: WebsiteWallOfLoveImageRecord[] = nextImageFileIds.map((fileId, index) => ({
        id: this.deps.idGenerator.newId(),
        tenantId,
        itemId: existing.id,
        fileId,
        order: index,
      }));
      await this.deps.wallOfLoveImagesRepo.replaceForItem(tenantId, existing.id, images);
    }

    return ok({
      item: toWebsiteWallOfLoveItemDto(updated, new Map([[updated.id, nextImageFileIds]])),
    });
  }
}
