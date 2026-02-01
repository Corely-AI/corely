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
  CreatePortfolioServiceInputSchema,
  GetPortfolioServiceOutputSchema,
  ListPortfolioServicesOutputSchema,
  UpdatePortfolioServiceInputSchema,
  type PortfolioContentStatus,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("portfolio")
@UseGuards(AuthGuard, RbacGuard)
export class PortfolioServicesController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get("showcases/:showcaseId/services")
  @RequirePermission("portfolio.read")
  async list(
    @Param("showcaseId") showcaseId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req);
    const status =
      typeof query.status === "string" ? (query.status as PortfolioContentStatus) : undefined;

    const result = await this.app.listServices.execute(
      {
        showcaseId,
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        sort: listQuery.sort,
        filters: listQuery.filters,
        status,
      },
      ctx
    );

    return ListPortfolioServicesOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("showcases/:showcaseId/services")
  @RequirePermission("portfolio.write")
  async create(
    @Param("showcaseId") showcaseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreatePortfolioServiceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createService.execute({ ...input, showcaseId }, ctx);
    return GetPortfolioServiceOutputSchema.parse({ service: mapResultToHttp(result) });
  }

  @Get("services/:id")
  @RequirePermission("portfolio.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getService.execute({ serviceId: id }, ctx);
    return GetPortfolioServiceOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch("services/:id")
  @RequirePermission("portfolio.write")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdatePortfolioServiceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateService.execute({ ...input, serviceId: id }, ctx);
    return GetPortfolioServiceOutputSchema.parse({ service: mapResultToHttp(result) });
  }

  @Delete("services/:id")
  @RequirePermission("portfolio.write")
  async delete(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteService.execute({ serviceId: id }, ctx);
    return mapResultToHttp(result);
  }
}
