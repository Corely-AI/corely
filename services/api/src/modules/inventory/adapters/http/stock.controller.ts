import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  GetOnHandInputSchema,
  GetAvailableInputSchema,
  ListStockMovesInputSchema,
  ListReservationsInputSchema,
  ListReorderPoliciesInputSchema,
  CreateReorderPolicyInputSchema,
  UpdateReorderPolicyInputSchema,
  GetReorderSuggestionsInputSchema,
  GetLowStockInputSchema,
} from "@corely/contracts";
import { StockApplication } from "../../application/stock.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";

@Controller("inventory")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class StockController {
  constructor(private readonly app: StockApplication) {}

  // ===== Stock Views =====
  @Get("stock/on-hand")
  @RequirePermission("inventory.documents.read")
  async getOnHand(@Query() query: any, @Req() req: Request) {
    const input = GetOnHandInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
      locationId: query.locationId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getOnHand.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("stock/available")
  @RequirePermission("inventory.documents.read")
  async getAvailable(@Query() query: any, @Req() req: Request) {
    const input = GetAvailableInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
      locationId: query.locationId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getAvailable.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("stock/moves")
  @RequirePermission("inventory.documents.read")
  async listStockMoves(@Query() query: any, @Req() req: Request) {
    const input = ListStockMovesInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listStockMoves.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("stock/reservations")
  @RequirePermission("inventory.documents.read")
  async listReservations(@Query() query: any, @Req() req: Request) {
    const input = ListReservationsInputSchema.parse({
      productId: query.productId,
      documentId: query.documentId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listReservations.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Reorder =====
  @Get("reorder-policies")
  @RequirePermission("inventory.reorder.manage")
  async listReorderPolicies(@Query() query: any, @Req() req: Request) {
    const input = ListReorderPoliciesInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listReorderPolicies.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("reorder-policies")
  @RequirePermission("inventory.reorder.manage")
  async createReorderPolicy(@Body() body: unknown, @Req() req: Request) {
    const input = CreateReorderPolicyInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createReorderPolicy.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("reorder-policies/:policyId")
  @RequirePermission("inventory.reorder.manage")
  async updateReorderPolicy(
    @Param("policyId") policyId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateReorderPolicyInputSchema.parse({
      ...(body as object),
      reorderPolicyId: policyId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateReorderPolicy.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("reorder/suggestions")
  @RequirePermission("inventory.reorder.manage")
  async getReorderSuggestions(@Query() query: any, @Req() req: Request) {
    const input = GetReorderSuggestionsInputSchema.parse({
      warehouseId: query.warehouseId,
      asOf: query.asOf,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getReorderSuggestions.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("low-stock")
  @RequirePermission("inventory.reorder.manage")
  async getLowStock(@Query() query: any, @Req() req: Request) {
    const input = GetLowStockInputSchema.parse({
      warehouseId: query.warehouseId,
      thresholdMode: query.thresholdMode,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getLowStock.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
