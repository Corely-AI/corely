import { Controller, Get, Header, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  CheckAvailabilityInputSchema,
  CheckAvailabilityOutputSchema,
  GetRentalContactSettingsOutputSchema,
  GetPublicRentalPropertyOutputSchema,
  ListPublicRentalPropertiesInputSchema,
  ListPublicRentalPropertiesOutputSchema,
  ListRentalCategoriesOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../../shared/public";
import { RentalsApplication } from "../../application/rentals.application";

@Controller("public/rentals")
@PublicWorkspaceRoute()
export class PublicRentalsController {
  constructor(private readonly app: RentalsApplication) {}

  @Get("properties")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ListPublicRentalPropertiesInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicProperties.execute(input, ctx);
    return ListPublicRentalPropertiesOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("properties/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getOne(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicProperty.execute({ slug }, ctx);
    return GetPublicRentalPropertyOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("properties/:slug/availability")
  @Header("Cache-Control", "no-store")
  async checkAvailability(
    @Param("slug") slug: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const input = CheckAvailabilityInputSchema.parse({
      propertySlug: slug,
      from: query.from,
      to: query.to,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.checkAvailability.execute(input, ctx);
    return CheckAvailabilityOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("categories")
  @Header("Cache-Control", "public, max-age=300, s-maxage=900, stale-while-revalidate=300")
  async listCategories(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listCategories.execute(undefined, ctx);
    return ListRentalCategoriesOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("settings")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getSettings(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicSettings.execute(undefined, ctx);
    return GetRentalContactSettingsOutputSchema.parse(mapResultToHttp(result));
  }
}
