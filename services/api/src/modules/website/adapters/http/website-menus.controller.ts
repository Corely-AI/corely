import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  UpsertWebsiteMenuInputSchema,
  UpsertWebsiteMenuOutputSchema,
  ListWebsiteMenusOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website/sites/:siteId/menus")
@UseGuards(AuthGuard)
export class WebsiteMenusController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get()
  async list(@Param("siteId") siteId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listMenus.execute({ siteId }, ctx);
    return ListWebsiteMenusOutputSchema.parse(mapResultToHttp(result));
  }

  @Put()
  async upsert(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpsertWebsiteMenuInputSchema.parse({ ...(body as any), siteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.upsertMenu.execute(input, ctx);
    return UpsertWebsiteMenuOutputSchema.parse(mapResultToHttp(result));
  }
}
