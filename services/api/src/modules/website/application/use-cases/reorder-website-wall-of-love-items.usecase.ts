import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type {
  ReorderWebsiteWallOfLoveItemsInput,
  ListWebsiteWallOfLoveItemsOutput,
} from "@corely/contracts";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteWallOfLoveRepositoryPort } from "../ports/wall-of-love-repository.port";
import type { WebsiteWallOfLoveImagesRepositoryPort } from "../ports/wall-of-love-images-repository.port";
import { assertWebsiteWrite } from "../../policies/website.policies";
import { buildImageMap, toWebsiteWallOfLoveItemDto } from "./wall-of-love.mapper";

type Deps = {
  logger: LoggerPort;
  clock: ClockPort;
  siteRepo: WebsiteSiteRepositoryPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
};

@RequireTenant()
export class ReorderWebsiteWallOfLoveItemsUseCase extends BaseUseCase<
  ReorderWebsiteWallOfLoveItemsInput,
  ListWebsiteWallOfLoveItemsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ReorderWebsiteWallOfLoveItemsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListWebsiteWallOfLoveItemsOutput, UseCaseError>> {
    assertWebsiteWrite(ctx);

    const tenantId = ctx.tenantId!;
    const site = await this.deps.siteRepo.findById(tenantId, input.siteId);
    if (!site) {
      return err(new ValidationError("site not found", undefined, "Website:SiteNotFound"));
    }

    const currentItems = await this.deps.wallOfLoveRepo.listForSite({
      tenantId,
      siteId: input.siteId,
    });
    const currentIds = currentItems.map((item) => item.id);
    const orderedIds = Array.from(new Set(input.orderedIds));

    if (orderedIds.length !== currentIds.length) {
      return err(
        new ValidationError(
          "orderedIds must include all item ids exactly once",
          undefined,
          "Website:WallOfLoveInvalidOrder"
        )
      );
    }

    const currentIdSet = new Set(currentIds);
    if (!orderedIds.every((id) => currentIdSet.has(id))) {
      return err(
        new ValidationError(
          "orderedIds contains ids that do not belong to this site",
          undefined,
          "Website:WallOfLoveInvalidOrder"
        )
      );
    }

    await this.deps.wallOfLoveRepo.reorder(
      tenantId,
      input.siteId,
      orderedIds,
      this.deps.clock.now().toISOString()
    );

    const updatedItems = await this.deps.wallOfLoveRepo.listForSite({
      tenantId,
      siteId: input.siteId,
    });
    const images = await this.deps.wallOfLoveImagesRepo.listByItemIds(
      tenantId,
      updatedItems.map((item) => item.id)
    );
    const imageMap = buildImageMap(images);

    return ok({
      items: updatedItems.map((item) => toWebsiteWallOfLoveItemDto(item, imageMap)),
    });
  }
}
