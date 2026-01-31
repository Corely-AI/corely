import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  CheckAvailabilityInputSchema,
  ListPublicRentalPropertiesInputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { PublicWorkspaceRoute } from "../../../../shared/public";
import { RentalsApplication } from "../../application/rentals.application";

@Controller("public/rentals")
@PublicWorkspaceRoute()
export class PublicRentalsController {
  constructor(private readonly app: RentalsApplication) {}

  @Get("properties")
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ListPublicRentalPropertiesInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicProperties.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("properties/:slug")
  async getOne(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicProperty.execute({ slug }, ctx);
    return mapResultToHttp(result);
  }

  @Get("properties/:slug/availability")
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
    return mapResultToHttp(result);
  }
}
