import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ListWarehousesInputSchema,
  CreateWarehouseInputSchema,
  UpdateWarehouseInputSchema,
  GetWarehouseInputSchema,
  ListLocationsInputSchema,
  CreateLocationInputSchema,
  UpdateLocationInputSchema,
} from "@corely/contracts";
import { WarehousesApplication } from "../../application/warehouses.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";

@Controller("inventory")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class WarehousesController {
  constructor(private readonly app: WarehousesApplication) {}

  // ===== Warehouses =====
  @Get("warehouses")
  @RequirePermission("inventory.warehouses.read")
  async listWarehouses(@Query() query: any, @Req() req: Request) {
    const input = ListWarehousesInputSchema.parse({
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listWarehouses.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("warehouses")
  @RequirePermission("inventory.warehouses.manage")
  async createWarehouse(@Body() body: unknown, @Req() req: Request) {
    const input = CreateWarehouseInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createWarehouse.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("warehouses/:warehouseId")
  @RequirePermission("inventory.warehouses.read")
  async getWarehouse(@Param("warehouseId") warehouseId: string, @Req() req: Request) {
    const input = GetWarehouseInputSchema.parse({ warehouseId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getWarehouse.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("warehouses/:warehouseId")
  @RequirePermission("inventory.warehouses.manage")
  async updateWarehouse(
    @Param("warehouseId") warehouseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateWarehouseInputSchema.parse({ ...(body as object), warehouseId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateWarehouse.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("warehouses/:warehouseId/locations")
  @RequirePermission("inventory.warehouses.read")
  async listLocations(@Param("warehouseId") warehouseId: string, @Req() req: Request) {
    const input = ListLocationsInputSchema.parse({ warehouseId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listLocations.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Locations =====
  @Post("locations")
  @RequirePermission("inventory.warehouses.manage")
  async createLocation(@Body() body: unknown, @Req() req: Request) {
    const input = CreateLocationInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createLocation.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("locations/:locationId")
  @RequirePermission("inventory.warehouses.manage")
  async updateLocation(
    @Param("locationId") locationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateLocationInputSchema.parse({ ...(body as object), locationId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateLocation.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
