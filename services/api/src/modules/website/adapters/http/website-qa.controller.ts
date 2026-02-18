import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateWebsiteQaInputSchema,
  ListWebsiteQaAdminInputSchema,
  ListWebsiteQaAdminOutputSchema,
  UpdateWebsiteQaInputSchema,
  UpsertWebsiteQaOutputSchema,
} from "@corely/contracts";
import { AuthGuard } from "@/modules/identity";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website/sites/:siteId/qa")
@UseGuards(AuthGuard)
export class WebsiteQaController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get()
  async list(
    @Param("siteId") siteId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const input = ListWebsiteQaAdminInputSchema.parse({
      siteId,
      locale: query.locale,
      scope: query.scope,
      pageId: query.pageId,
      status: query.status,
    });

    const ctx = buildUseCaseContext(req);
    const result = await this.app.listQa.execute(input, ctx);
    return ListWebsiteQaAdminOutputSchema.parse(mapResultToHttp(result));
  }

  @Post()
  async create(@Param("siteId") siteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = CreateWebsiteQaInputSchema.parse({
      ...(body as Record<string, unknown>),
      siteId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createQa.execute(input, ctx);
    return UpsertWebsiteQaOutputSchema.parse(mapResultToHttp(result));
  }

  @Put(":qaId")
  async update(
    @Param("siteId") siteId: string,
    @Param("qaId") qaId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateWebsiteQaInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateQa.execute({ siteId, qaId, input }, ctx);
    return UpsertWebsiteQaOutputSchema.parse(mapResultToHttp(result));
  }

  @Delete(":qaId")
  async remove(@Param("siteId") siteId: string, @Param("qaId") qaId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteQa.execute({ siteId, qaId }, ctx);
    return mapResultToHttp(result);
  }
}
