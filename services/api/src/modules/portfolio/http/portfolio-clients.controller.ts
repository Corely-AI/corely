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
  CreatePortfolioClientInputSchema,
  GetPortfolioClientOutputSchema,
  ListPortfolioClientsOutputSchema,
  UpdatePortfolioClientInputSchema,
  type PortfolioClientType,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("portfolio")
@UseGuards(AuthGuard, RbacGuard)
export class PortfolioClientsController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get("showcases/:showcaseId/clients")
  @RequirePermission("portfolio.read")
  async list(
    @Param("showcaseId") showcaseId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req);
    const clientType =
      typeof query.clientType === "string" ? (query.clientType as PortfolioClientType) : undefined;
    const featured =
      typeof query.featured === "string"
        ? query.featured === "true" || query.featured === "1"
        : undefined;

    const result = await this.app.listClients.execute(
      {
        showcaseId,
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        sort: listQuery.sort,
        filters: listQuery.filters,
        clientType,
        featured,
      },
      ctx
    );

    return ListPortfolioClientsOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("showcases/:showcaseId/clients")
  @RequirePermission("portfolio.write")
  async create(
    @Param("showcaseId") showcaseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreatePortfolioClientInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createClient.execute({ ...input, showcaseId }, ctx);
    return GetPortfolioClientOutputSchema.parse({ client: mapResultToHttp(result) });
  }

  @Get("clients/:id")
  @RequirePermission("portfolio.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getClient.execute({ clientId: id }, ctx);
    return GetPortfolioClientOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch("clients/:id")
  @RequirePermission("portfolio.write")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdatePortfolioClientInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateClient.execute({ ...input, clientId: id }, ctx);
    return GetPortfolioClientOutputSchema.parse({ client: mapResultToHttp(result) });
  }

  @Delete("clients/:id")
  @RequirePermission("portfolio.write")
  async delete(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteClient.execute({ clientId: id }, ctx);
    return mapResultToHttp(result);
  }
}
