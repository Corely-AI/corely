import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateRentalPropertyInputSchema,
  ListRentalPropertiesInputSchema,
  UpdateRentalPropertyInputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RentalsApplication } from "../../application/rentals.application";

@Controller("rentals/properties")
@UseGuards(AuthGuard)
export class RentalsPropertyController {
  constructor(private readonly app: RentalsApplication) {}

  @Get()
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query);
    const input = ListRentalPropertiesInputSchema.parse({
      status: query.status,
      categoryId: query.categoryId,
      q: listQuery.q,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listProperties.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateRentalPropertyInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createProperty.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getProperty.execute({ id }, ctx);
    return mapResultToHttp(result);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateRentalPropertyInputSchema.parse({ ...(body as any), id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateProperty.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":id/publish")
  async publish(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.publishProperty.execute({ id }, ctx);
    return mapResultToHttp(result);
  }

  @Post(":id/unpublish")
  async unpublish(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    // Reuse updateProperty for simplicity
    const result = await this.app.updateProperty.execute({ id, status: "DRAFT" }, ctx);
    return mapResultToHttp(result);
  }
}
