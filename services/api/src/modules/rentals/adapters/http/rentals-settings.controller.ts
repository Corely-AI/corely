import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  GetRentalContactSettingsOutputSchema,
  UpdateRentalContactSettingsInputSchema,
  UpdateRentalContactSettingsOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RentalsApplication } from "../../application/rentals.application";

@Controller("rentals/settings")
@UseGuards(AuthGuard)
export class RentalsSettingsController {
  constructor(private readonly app: RentalsApplication) {}

  @Get()
  async getSettings(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getSettings.execute(undefined, ctx);
    return GetRentalContactSettingsOutputSchema.parse(mapResultToHttp(result));
  }

  @Patch()
  async updateSettings(@Body() body: unknown, @Req() req: Request) {
    const input = UpdateRentalContactSettingsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateSettings.execute(input, ctx);
    return UpdateRentalContactSettingsOutputSchema.parse(mapResultToHttp(result));
  }
}
