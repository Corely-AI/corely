import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type {
  PublishWebsiteWallOfLoveItemInput,
  WebsiteWallOfLoveUpsertOutput,
} from "@corely/contracts";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { WebsiteWallOfLoveRepositoryPort } from "../ports/wall-of-love-repository.port";
import type { WebsiteWallOfLoveImagesRepositoryPort } from "../ports/wall-of-love-images-repository.port";
import { assertWebsitePublish } from "../../policies/website.policies";
import { normalizeWallOfLoveLink } from "../../domain/wall-of-love-links";
import { toWebsiteWallOfLoveItemDto } from "./wall-of-love.mapper";

type Deps = {
  logger: LoggerPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
  clock: ClockPort;
};

@RequireTenant()
export class PublishWebsiteWallOfLoveItemUseCase extends BaseUseCase<
  PublishWebsiteWallOfLoveItemInput,
  WebsiteWallOfLoveUpsertOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PublishWebsiteWallOfLoveItemInput,
    ctx: UseCaseContext
  ): Promise<Result<WebsiteWallOfLoveUpsertOutput, UseCaseError>> {
    assertWebsitePublish(ctx);

    const tenantId = ctx.tenantId!;
    const existing = await this.deps.wallOfLoveRepo.findById(tenantId, input.itemId);
    if (!existing) {
      return err(
        new NotFoundError("Wall of Love item not found", undefined, "Website:WallOfLoveNotFound")
      );
    }

    const imageRecords = await this.deps.wallOfLoveImagesRepo.listByItemIds(tenantId, [
      existing.id,
    ]);
    const imageFileIds = imageRecords
      .sort((a, b) => a.order - b.order)
      .map((image) => image.fileId);
    if (existing.type === "image" && imageFileIds.length === 0) {
      return err(
        new ValidationError(
          "Image items require at least one image before publishing",
          undefined,
          "Website:WallOfLoveImageRequired"
        )
      );
    }

    const canonicalLinkUrl = normalizeWallOfLoveLink(existing.type, existing.linkUrl ?? null);
    const updated = await this.deps.wallOfLoveRepo.update({
      ...existing,
      status: "published",
      linkUrl: canonicalLinkUrl,
      updatedAt: this.deps.clock.now().toISOString(),
    });

    return ok({
      item: toWebsiteWallOfLoveItemDto(updated, new Map([[updated.id, imageFileIds]])),
    });
  }
}
