import { Controller, Get, Header, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  PublicPortfolioShowcaseListInputSchema,
  PublicPortfolioShowcaseOutputSchema,
  PublicPortfolioShowcasesOutputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../shared/public";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("public/portfolio")
@PublicWorkspaceRoute()
export class PortfolioPublicSiteController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async listShowcases(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = PublicPortfolioShowcaseListInputSchema.parse({
      q: listQuery.q,
      page: listQuery.page,
      pageSize: listQuery.pageSize,
      type: typeof query.type === "string" ? query.type : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicShowcases.execute(input, ctx);
    return PublicPortfolioShowcasesOutputSchema.parse(mapResultToHttp(result));
  }

  @Get(":slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getShowcase(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicShowcase.execute({ slug }, ctx);
    return PublicPortfolioShowcaseOutputSchema.parse(mapResultToHttp(result));
  }
}
