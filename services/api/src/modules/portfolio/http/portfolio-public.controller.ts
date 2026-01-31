import { Controller, Get, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  PublicPortfolioShowcaseOutputSchema,
  PublicPortfolioProjectsOutputSchema,
  PublicPortfolioProjectOutputSchema,
  PublicPortfolioClientsOutputSchema,
  PublicPortfolioServicesOutputSchema,
  PublicPortfolioTeamMembersOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { PortfolioApplication } from "../application/portfolio.application";

@Controller("public/portfolio")
export class PortfolioPublicController {
  constructor(private readonly app: PortfolioApplication) {}

  @Get("showcases/:slug")
  async getShowcase(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicShowcase.execute({ slug }, ctx);
    return PublicPortfolioShowcaseOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("showcases/:slug/projects")
  async listProjects(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicProjects.execute({ slug }, ctx);
    return PublicPortfolioProjectsOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("showcases/:slug/projects/:projectSlug")
  async getProject(
    @Param("slug") slug: string,
    @Param("projectSlug") projectSlug: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicProject.execute({ slug, projectSlug }, ctx);
    return PublicPortfolioProjectOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("showcases/:slug/clients")
  async listClients(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicClients.execute({ slug }, ctx);
    return PublicPortfolioClientsOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("showcases/:slug/services")
  async listServices(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicServices.execute({ slug }, ctx);
    return PublicPortfolioServicesOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("showcases/:slug/team")
  async listTeam(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicTeam.execute({ slug }, ctx);
    return PublicPortfolioTeamMembersOutputSchema.parse(mapResultToHttp(result));
  }
}
