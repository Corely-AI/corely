import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import { CsvExportInterceptor } from "../../../shared/infrastructure/csv";
import {
  CreateLotInputSchema,
  GetLotInputSchema,
  ListLotsInputSchema,
  GetExpirySummaryInputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";
import { CreateLotUseCase } from "../../application/use-cases/create-lot.usecase";
import { ListLotsUseCase } from "../../application/use-cases/list-lots.usecase";
import { GetLotUseCase } from "../../application/use-cases/get-lot.usecase";
import { GetExpirySummaryUseCase } from "../../application/use-cases/get-expiry-summary.usecase";

@Controller("inventory")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class InventoryLotController {
  constructor(
    private readonly createLot: CreateLotUseCase,
    private readonly listLots: ListLotsUseCase,
    private readonly getLot: GetLotUseCase,
    private readonly getExpirySummary: GetExpirySummaryUseCase
  ) {}

  @Post("lots")
  @RequirePermission("inventory.lots.manage")
  async createLotEndpoint(@Body() body: unknown, @Req() req: Request) {
    const input = CreateLotInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createLot.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("lots")
  @RequirePermission("inventory.lots.read")
  @UseInterceptors(CsvExportInterceptor)
  async listLotsEndpoint(@Query() query: any, @Req() req: Request) {
    const input = ListLotsInputSchema.parse({
      productId: query.productId,
      status: query.status,
      expiryBefore: query.expiryBefore,
      expiryAfter: query.expiryAfter,
      shipmentId: query.shipmentId,
      supplierPartyId: query.supplierPartyId,
      qtyOnHandGt: query.qtyOnHandGt ? Number(query.qtyOnHandGt) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.listLots.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("lots/:id")
  @RequirePermission("inventory.lots.read")
  async getLotEndpoint(@Param("id") id: string, @Req() req: Request) {
    const input = GetLotInputSchema.parse({ id });
    const ctx = buildUseCaseContext(req);
    const result = await this.getLot.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("expiry/summary")
  @RequirePermission("inventory.lots.read")
  async getExpirySummaryEndpoint(@Query() query: any, @Req() req: Request) {
    const input = GetExpirySummaryInputSchema.parse({
      days: query.days ? Number(query.days) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.getExpirySummary.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
