import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  AddWebsiteDomainInputSchema,
  WebsiteDomainSchema,
  ListWebsiteDomainsOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website/sites/:siteId/domains")
@UseGuards(AuthGuard)
export class WebsiteDomainsController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get()
  async list(@Param("siteId") siteId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listDomains.execute({ siteId }, ctx);
    return ListWebsiteDomainsOutputSchema.parse(mapResultToHttp(result));
  }

  @Post()
  async add(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = AddWebsiteDomainInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.addDomain.execute({ siteId, input }, ctx);
    return WebsiteDomainSchema.parse(mapResultToHttp(result));
  }

  @Delete(":domainId")
  async remove(
    @Param("siteId") siteId: string,
    @Param("domainId") domainId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.removeDomain.execute({ siteId, domainId }, ctx);
    return mapResultToHttp(result);
  }
}
