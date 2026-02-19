import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateWebsitePageInputSchema,
  UpdateWebsitePageInputSchema,
  ListWebsitePagesInputSchema,
  WebsitePageSchema,
  PublishWebsitePageOutputSchema,
  UnpublishWebsitePageOutputSchema,
  GetWebsitePageOutputSchema,
  GetWebsitePageContentOutputSchema,
  UpdateWebsitePageContentInputSchema,
  UpdateWebsitePageContentOutputSchema,
} from "@corely/contracts";
import { parseListQuery } from "@/shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website")
@UseGuards(AuthGuard)
export class WebsitePagesController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get("sites/:siteId/pages")
  async list(
    @Param("siteId") siteId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const listQuery = parseListQuery(query);
    const input = ListWebsitePagesInputSchema.parse({
      siteId,
      status: typeof query.status === "string" ? query.status : undefined,
      q: listQuery.q,
      page: listQuery.page,
      pageSize: listQuery.pageSize,
      sort: listQuery.sort,
      filters: listQuery.filters,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPages.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("sites/:siteId/pages")
  async create(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = CreateWebsitePageInputSchema.parse({ ...(body as any), siteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createPage.execute(input, ctx);
    return WebsitePageSchema.parse(mapResultToHttp(result));
  }

  @Get("pages/:pageId")
  async get(@Param("pageId") pageId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPage.execute({ pageId }, ctx);
    return GetWebsitePageOutputSchema.parse(mapResultToHttp(result));
  }

  @Put("pages/:pageId")
  async update(@Param("pageId") pageId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateWebsitePageInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updatePage.execute({ pageId, input }, ctx);
    return WebsitePageSchema.parse(mapResultToHttp(result));
  }

  @Get("pages/:pageId/content")
  async getContent(@Param("pageId") pageId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPageContent.execute({ pageId }, ctx);
    return GetWebsitePageContentOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch("pages/:pageId/content")
  async patchContent(@Param("pageId") pageId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateWebsitePageContentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updatePageContent.execute({ pageId, input }, ctx);
    return UpdateWebsitePageContentOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("pages/:pageId/publish")
  async publish(@Param("pageId") pageId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.publishPage.execute({ pageId }, ctx);
    return PublishWebsitePageOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("pages/:pageId/unpublish")
  async unpublish(@Param("pageId") pageId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unpublishPage.execute({ pageId }, ctx);
    return UnpublishWebsitePageOutputSchema.parse(mapResultToHttp(result));
  }
}
