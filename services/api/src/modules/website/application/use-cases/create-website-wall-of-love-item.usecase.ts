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
  CreateWebsiteWallOfLoveItemInput,
  WebsiteWallOfLoveUpsertOutput,
} from "@corely/contracts";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
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
  siteRepo: WebsiteSiteRepositoryPort;
  wallOfLoveRepo: WebsiteWallOfLoveRepositoryPort;
  wallOfLoveImagesRepo: WebsiteWallOfLoveImagesRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

const normalizeImageFileIds = (rawIds: string[] | undefined): string[] => {
  if (!rawIds) {
    return [];
  }
  return Array.from(new Set(rawIds.map((id) => id.trim()).filter(Boolean))).slice(0, 1);
};

@RequireTenant()
export class CreateWebsiteWallOfLoveItemUseCase extends BaseUseCase<
  CreateWebsiteWallOfLoveItemInput,
  WebsiteWallOfLoveUpsertOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateWebsiteWallOfLoveItemInput,
    ctx: UseCaseContext
  ): Promise<Result<WebsiteWallOfLoveUpsertOutput, UseCaseError>> {
    assertWebsiteWrite(ctx);

    const tenantId = ctx.tenantId!;
    const site = await this.deps.siteRepo.findById(tenantId, input.siteId);
    if (!site) {
      return err(new ValidationError("site not found", undefined, "Website:SiteNotFound"));
    }

    const now = this.deps.clock.now().toISOString();
    const itemId = this.deps.idGenerator.newId();
    const order = await this.deps.wallOfLoveRepo.nextOrder(tenantId, input.siteId);
    const imageFileIds = normalizeImageFileIds(input.imageFileIds);

    const item = await this.deps.wallOfLoveRepo.create({
      id: itemId,
      tenantId,
      siteId: input.siteId,
      type: input.type,
      status: "draft",
      order,
      quote: input.quote ?? null,
      authorName: input.authorName ?? null,
      authorTitle: input.authorTitle ?? null,
      sourceLabel: input.sourceLabel ?? null,
      linkUrl: normalizeWallOfLoveLink(input.type, input.linkUrl),
      createdAt: now,
      updatedAt: now,
    });

    const images: WebsiteWallOfLoveImageRecord[] = imageFileIds.map((fileId, index) => ({
      id: this.deps.idGenerator.newId(),
      tenantId,
      itemId: item.id,
      fileId,
      order: index,
    }));
    await this.deps.wallOfLoveImagesRepo.replaceForItem(tenantId, item.id, images);

    return ok({
      item: toWebsiteWallOfLoveItemDto(item, new Map([[item.id, imageFileIds]])),
    });
  }
}
