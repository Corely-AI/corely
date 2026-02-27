import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateWebsiteWallOfLoveItemInputSchema,
  ListWebsiteWallOfLoveItemsOutputSchema,
  PublishWebsiteWallOfLoveItemInputSchema,
  ReorderWebsiteWallOfLoveItemsInputSchema,
  UnpublishWebsiteWallOfLoveItemInputSchema,
  UpdateWebsiteWallOfLoveItemInputSchema,
  WebsiteWallOfLoveUpsertOutputSchema,
} from "@corely/contracts";
import { AuthGuard } from "@/modules/identity";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website")
@UseGuards(AuthGuard)
export class WebsiteWallOfLoveController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get("sites/:siteId/wall-of-love/items")
  async list(@Param("siteId") siteId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listWallOfLoveItems.execute({ siteId }, ctx);
    return ListWebsiteWallOfLoveItemsOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("sites/:siteId/wall-of-love/items")
  async create(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = CreateWebsiteWallOfLoveItemInputSchema.parse({
      ...(body as Record<string, unknown>),
      siteId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createWallOfLoveItem.execute(input, ctx);
    return WebsiteWallOfLoveUpsertOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch("wall-of-love/items/:itemId")
  async update(@Param("itemId") itemId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateWebsiteWallOfLoveItemInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateWallOfLoveItem.execute({ itemId, input }, ctx);
    return WebsiteWallOfLoveUpsertOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("wall-of-love/items/:itemId/publish")
  async publish(@Param("itemId") itemId: string, @Req() req: Request) {
    const input = PublishWebsiteWallOfLoveItemInputSchema.parse({ itemId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.publishWallOfLoveItem.execute(input, ctx);
    return WebsiteWallOfLoveUpsertOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("wall-of-love/items/:itemId/unpublish")
  async unpublish(@Param("itemId") itemId: string, @Req() req: Request) {
    const input = UnpublishWebsiteWallOfLoveItemInputSchema.parse({ itemId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unpublishWallOfLoveItem.execute(input, ctx);
    return WebsiteWallOfLoveUpsertOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("sites/:siteId/wall-of-love/items/reorder")
  async reorder(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const raw = body as Record<string, unknown>;
    const input = ReorderWebsiteWallOfLoveItemsInputSchema.parse({
      siteId,
      orderedIds: raw.orderedIds,
    });

    const ctx = buildUseCaseContext(req);
    const result = await this.app.reorderWallOfLoveItems.execute(input, ctx);
    return ListWebsiteWallOfLoveItemsOutputSchema.parse(mapResultToHttp(result));
  }
}
