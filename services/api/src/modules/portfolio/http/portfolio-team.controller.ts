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
  CreatePortfolioTeamMemberInputSchema,
  GetPortfolioTeamMemberOutputSchema,
  ListPortfolioTeamMembersOutputSchema,
  UpdatePortfolioTeamMemberInputSchema,
  type PortfolioContentStatus,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("portfolio")
@UseGuards(AuthGuard, RbacGuard)
export class PortfolioTeamController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get("showcases/:showcaseId/team")
  @RequirePermission("portfolio.read")
  async list(
    @Param("showcaseId") showcaseId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req);
    const status = typeof query.status === "string" ? (query.status as PortfolioContentStatus) : undefined;

    const result = await this.app.listTeamMembers.execute(
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

    return ListPortfolioTeamMembersOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("showcases/:showcaseId/team")
  @RequirePermission("portfolio.write")
  async create(
    @Param("showcaseId") showcaseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreatePortfolioTeamMemberInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createTeamMember.execute({ ...input, showcaseId }, ctx);
    return GetPortfolioTeamMemberOutputSchema.parse({ teamMember: mapResultToHttp(result) });
  }

  @Get("team/:id")
  @RequirePermission("portfolio.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getTeamMember.execute({ memberId: id }, ctx);
    return GetPortfolioTeamMemberOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch("team/:id")
  @RequirePermission("portfolio.write")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdatePortfolioTeamMemberInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateTeamMember.execute({ ...input, memberId: id }, ctx);
    return GetPortfolioTeamMemberOutputSchema.parse({ teamMember: mapResultToHttp(result) });
  }

  @Delete("team/:id")
  @RequirePermission("portfolio.write")
  async delete(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteTeamMember.execute({ memberId: id }, ctx);
    return mapResultToHttp(result);
  }
}
