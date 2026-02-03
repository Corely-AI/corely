import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateRentalCategoryInputSchema,
  UpdateRentalCategoryInputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RentalsApplication } from "../../application/rentals.application";

@Controller("rentals/categories")
@UseGuards(AuthGuard)
export class RentalsCategoryController {
  constructor(private readonly app: RentalsApplication) {}

  @Get()
  async list(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listCategories.execute(undefined, ctx);
    return mapResultToHttp(result);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateRentalCategoryInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createCategory.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateRentalCategoryInputSchema.parse({ ...(body as any), id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateCategory.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deleteCategory.execute(id, ctx);
    mapResultToHttp(result);
  }
}
