import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ListProductsInputSchema,
  CreateProductInputSchema,
  UpdateProductInputSchema,
  GetProductInputSchema,
  ActivateProductInputSchema,
  DeactivateProductInputSchema,
} from "@corely/contracts";
import { ProductsApplication } from "../../application/products.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";

@Controller("inventory/products")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class ProductsController {
  constructor(private readonly app: ProductsApplication) {}

  @Get()
  @RequirePermission("inventory.products.read")
  async listProducts(@Query() query: any, @Req() req: Request) {
    const input = ListProductsInputSchema.parse({
      search: query.search,
      type: query.type,
      isActive: query.isActive !== undefined ? query.isActive === "true" : undefined,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listProducts.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post()
  @RequirePermission("inventory.products.manage")
  async createProduct(@Body() body: unknown, @Req() req: Request) {
    const input = CreateProductInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":productId")
  @RequirePermission("inventory.products.read")
  async getProduct(@Param("productId") productId: string, @Req() req: Request) {
    const input = GetProductInputSchema.parse({ productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch(":productId")
  @RequirePermission("inventory.products.manage")
  async updateProduct(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateProductInputSchema.parse({ ...(body as object), productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":productId/activate")
  @RequirePermission("inventory.products.manage")
  async activateProduct(@Param("productId") productId: string, @Req() req: Request) {
    const input = ActivateProductInputSchema.parse({ productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.activateProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":productId/deactivate")
  @RequirePermission("inventory.products.manage")
  async deactivateProduct(@Param("productId") productId: string, @Req() req: Request) {
    const input = DeactivateProductInputSchema.parse({ productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deactivateProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
