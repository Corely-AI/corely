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
import type { ListWebsiteWallOfLoveItemsOutput } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteWallOfLoveRepositoryPort } from "../ports/wall-of-love-repository.port";
import type { WebsiteWallOfLoveImagesRepositoryPort } from "../ports/wall-of-love-images-repository.port";
import { assertWebsiteRead } from "../../policies/website.policies";
import { buildImageMap, toWebsiteWallOfLoveItemDto } from "./wall-of-love.mapper";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
};

@RequireTenant()
export class ListWebsiteWallOfLoveItemsUseCase extends BaseUseCase<
  { siteId: string },
  ListWebsiteWallOfLoveItemsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string },
    ctx: UseCaseContext
  ): Promise<Result<ListWebsiteWallOfLoveItemsOutput, UseCaseError>> {
    assertWebsiteRead(ctx);

    const tenantId = ctx.tenantId!;
    const site = await this.deps.siteRepo.findById(tenantId, input.siteId);
    if (!site) {
      return err(new ValidationError("site not found", undefined, "Website:SiteNotFound"));
    }

    const items = await this.deps.wallOfLoveRepo.listForSite({
      tenantId,
      siteId: input.siteId,
    });
    const images = await this.deps.wallOfLoveImagesRepo.listByItemIds(
      tenantId,
      items.map((item) => item.id)
    );
    const imageMap = buildImageMap(images);

    return ok({
      items: items.map((item) => toWebsiteWallOfLoveItemDto(item, imageMap)),
    });
  }
}
