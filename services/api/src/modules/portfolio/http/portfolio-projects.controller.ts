import {
  Body,
  Controller,
  Delete,
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
  CreatePortfolioProjectInputSchema,
  GetPortfolioProjectOutputSchema,
  ListPortfolioProjectsOutputSchema,
  SetProjectClientsInputSchema,
  UpdatePortfolioProjectInputSchema,
  type PortfolioContentStatus,
  type PortfolioProjectType,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("portfolio")
@UseGuards(AuthGuard, RbacGuard)
export class PortfolioProjectsController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get("showcases/:showcaseId/projects")
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
    const type = typeof query.type === "string" ? (query.type as PortfolioProjectType) : undefined;
    const featured =
      typeof query.featured === "string"
        ? query.featured === "true" || query.featured === "1"
        : undefined;

    const result = await this.app.listProjects.execute(
      {
        showcaseId,
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        sort: listQuery.sort,
        filters: listQuery.filters,
        status,
        type,
        featured,
      },
      ctx
    );

    return ListPortfolioProjectsOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("showcases/:showcaseId/projects")
  @RequirePermission("portfolio.write")
  async create(
    @Param("showcaseId") showcaseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreatePortfolioProjectInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createProject.execute({ ...input, showcaseId }, ctx);
    return GetPortfolioProjectOutputSchema.parse({ project: mapResultToHttp(result) });
  }

  @Get("projects/:id")
  @RequirePermission("portfolio.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getProject.execute({ projectId: id }, ctx);
    return GetPortfolioProjectOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch("projects/:id")
  @RequirePermission("portfolio.write")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdatePortfolioProjectInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateProject.execute({ ...input, projectId: id }, ctx);
    return GetPortfolioProjectOutputSchema.parse({ project: mapResultToHttp(result) });
  }

  @Delete("projects/:id")
  @RequirePermission("portfolio.write")
  async delete(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteProject.execute({ projectId: id }, ctx);
    return mapResultToHttp(result);
  }

  @Put("projects/:id/clients")
  @RequirePermission("portfolio.write")
  async setClients(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = SetProjectClientsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.setProjectClients.execute({ ...input, projectId: id }, ctx);
    return mapResultToHttp(result);
  }
}
