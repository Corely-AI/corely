import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreatePortfolioShowcaseInputSchema,
  GetPortfolioShowcaseOutputSchema,
  ListPortfolioShowcasesOutputSchema,
  UpdatePortfolioShowcaseInputSchema,
  type PortfolioShowcaseType,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("portfolio/showcases")
@UseGuards(AuthGuard, RbacGuard)
export class PortfolioShowcasesController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get()
  @RequirePermission("portfolio.read")
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req);
    const type = typeof query.type === "string" ? (query.type as PortfolioShowcaseType) : undefined;
    const isPublished =
      typeof query.isPublished === "string"
        ? query.isPublished === "true" || query.isPublished === "1"
        : undefined;

    const result = await this.app.listShowcases.execute(
      {
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        sort: listQuery.sort,
        filters: listQuery.filters,
        type,
        isPublished,
      },
      ctx
    );

    return ListPortfolioShowcasesOutputSchema.parse(mapResultToHttp(result));
  }

  @Post()
  @RequirePermission("portfolio.write")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreatePortfolioShowcaseInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createShowcase.execute(input, ctx);
    return GetPortfolioShowcaseOutputSchema.parse({ showcase: mapResultToHttp(result) });
  }

  @Get(":id")
  @RequirePermission("portfolio.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getShowcase.execute({ showcaseId: id }, ctx);
    return GetPortfolioShowcaseOutputSchema.parse({ showcase: mapResultToHttp(result) });
  }

  @Patch(":id")
  @RequirePermission("portfolio.write")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdatePortfolioShowcaseInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateShowcase.execute({ ...input, showcaseId: id }, ctx);
    return GetPortfolioShowcaseOutputSchema.parse({ showcase: mapResultToHttp(result) });
  }

  @Delete(":id")
  @RequirePermission("portfolio.write")
  async delete(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteShowcase.execute({ showcaseId: id }, ctx);
    return mapResultToHttp(result);
  }
}
