import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateWebsiteSiteInputSchema,
  GetWebsiteSiteOutputSchema,
  ListWebsiteSitesInputSchema,
  UpdateWebsiteSiteInputSchema,
  WebsiteSiteSchema,
} from "@corely/contracts";
import { parseListQuery } from "@/shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website/sites")
@UseGuards(AuthGuard)
export class WebsiteSitesController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get()
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query);
    const input = ListWebsiteSitesInputSchema.parse({
      q: listQuery.q,
      page: listQuery.page,
      pageSize: listQuery.pageSize,
      sort: listQuery.sort,
      filters: listQuery.filters,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listSites.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateWebsiteSiteInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createSite.execute(input, ctx);
    return WebsiteSiteSchema.parse(mapResultToHttp(result));
  }

  @Get(":siteId")
  async get(@Param("siteId") siteId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getSite.execute({ siteId }, ctx);
    return GetWebsiteSiteOutputSchema.parse(mapResultToHttp(result));
  }

  @Put(":siteId")
  async update(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateWebsiteSiteInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateSite.execute({ siteId, input }, ctx);
    return WebsiteSiteSchema.parse(mapResultToHttp(result));
  }
}
