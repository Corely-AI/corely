import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  GetPortfolioProfileOutputSchema,
  UpsertPortfolioProfileInputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("portfolio/showcases/:showcaseId/profile")
@UseGuards(AuthGuard, RbacGuard)
export class PortfolioProfileController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get()
  @RequirePermission("portfolio.read")
  async get(@Param("showcaseId") showcaseId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getProfile.execute({ showcaseId }, ctx);
    return GetPortfolioProfileOutputSchema.parse({ profile: mapResultToHttp(result) });
  }

  @Put()
  @RequirePermission("portfolio.write")
  async upsert(
    @Param("showcaseId") showcaseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpsertPortfolioProfileInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.upsertProfile.execute({ ...input, showcaseId }, ctx);
    return GetPortfolioProfileOutputSchema.parse({ profile: mapResultToHttp(result) });
  }
}
