import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CreateDimensionTypeInputSchema,
  CreateDimensionValueInputSchema,
  SetEntityDimensionsInputSchema,
  UpdateDimensionTypeInputSchema,
  UpdateDimensionValueInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../identity/adapters/http/current-user.decorator";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import { CreateDimensionTypeUseCase } from "../application/use-cases/dimensions.usecases";
import { UpdateDimensionTypeUseCase } from "../application/use-cases/dimensions.usecases";
import { DeleteDimensionTypeUseCase } from "../application/use-cases/dimensions.usecases";
import { CreateDimensionValueUseCase } from "../application/use-cases/dimensions.usecases";
import { UpdateDimensionValueUseCase } from "../application/use-cases/dimensions.usecases";
import { DeleteDimensionValueUseCase } from "../application/use-cases/dimensions.usecases";
import { SetEntityDimensionsUseCase } from "../application/use-cases/dimensions.usecases";
import { GetEntityDimensionsUseCase } from "../application/use-cases/dimensions.usecases";
import {
  DIMENSIONS_READ_PORT,
  type DimensionsReadPort,
} from "../application/ports/custom-attributes.ports";
import { Inject } from "@nestjs/common";

@Controller("platform/dimensions")
@UseGuards(AuthGuard, RbacGuard)
export class DimensionsController {
  constructor(
    private readonly createTypeUseCase: CreateDimensionTypeUseCase,
    private readonly updateTypeUseCase: UpdateDimensionTypeUseCase,
    private readonly deleteTypeUseCase: DeleteDimensionTypeUseCase,
    private readonly createValueUseCase: CreateDimensionValueUseCase,
    private readonly updateValueUseCase: UpdateDimensionValueUseCase,
    private readonly deleteValueUseCase: DeleteDimensionValueUseCase,
    private readonly setEntityDimensionsUseCase: SetEntityDimensionsUseCase,
    private readonly getEntityDimensionsUseCase: GetEntityDimensionsUseCase,
    @Inject(DIMENSIONS_READ_PORT) private readonly dimensionsRead: DimensionsReadPort
  ) {}

  @Get("types")
  @RequirePermission("platform.settings.read")
  async listTypes(@CurrentTenantId() tenantId: string, @Query("appliesTo") appliesTo?: string) {
    ensureTenant(tenantId);
    return this.dimensionsRead.listTypes(tenantId, appliesTo);
  }

  @Post("types")
  @RequirePermission("platform.settings.write")
  async createType(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey?: string
  ) {
    ensureTenant(tenantId);
    const input = CreateDimensionTypeInputSchema.parse(body);
    return this.createTypeUseCase.execute(tenantId, userId, input, idempotencyKey);
  }

  @Patch("types/:id")
  @RequirePermission("platform.settings.write")
  async updateType(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    ensureTenant(tenantId);
    const patch = UpdateDimensionTypeInputSchema.parse(body);
    return this.updateTypeUseCase.execute(tenantId, userId, id, patch);
  }

  @Delete("types/:id")
  @RequirePermission("platform.settings.write")
  async deleteType(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("id") id: string
  ) {
    ensureTenant(tenantId);
    await this.deleteTypeUseCase.execute(tenantId, userId, id);
    return { success: true };
  }

  @Get("types/:id/values")
  @RequirePermission("platform.settings.read")
  async listValues(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    ensureTenant(tenantId);
    return this.dimensionsRead.listValues(tenantId, id);
  }

  @Post("types/:id/values")
  @RequirePermission("platform.settings.write")
  async createValue(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey?: string
  ) {
    ensureTenant(tenantId);
    const input = CreateDimensionValueInputSchema.parse({
      ...(body as object),
      typeId: id,
    });
    return this.createValueUseCase.execute(tenantId, userId, id, input, idempotencyKey);
  }

  @Patch("values/:id")
  @RequirePermission("platform.settings.write")
  async updateValue(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    ensureTenant(tenantId);
    const patch = UpdateDimensionValueInputSchema.parse(body);
    return this.updateValueUseCase.execute(tenantId, userId, id, patch);
  }

  @Delete("values/:id")
  @RequirePermission("platform.settings.write")
  async deleteValue(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("id") id: string
  ) {
    ensureTenant(tenantId);
    await this.deleteValueUseCase.execute(tenantId, userId, id);
    return { success: true };
  }

  @Get("entities/:entityType/:entityId")
  @RequirePermission("platform.settings.read")
  async getEntityDimensions(
    @CurrentTenantId() tenantId: string,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string
  ) {
    ensureTenant(tenantId);
    return this.getEntityDimensionsUseCase.execute(tenantId, entityType, entityId);
  }

  @Put("entities/:entityType/:entityId")
  @RequirePermission("platform.settings.write")
  async setEntityDimensions(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Body() body: unknown
  ) {
    ensureTenant(tenantId);
    const parsed = SetEntityDimensionsInputSchema.parse(body);
    return this.setEntityDimensionsUseCase.execute(
      tenantId,
      userId,
      entityType,
      entityId,
      parsed.assignments
    );
  }
}

function ensureTenant(tenantId: string) {
  if (!tenantId) {
    throw new BadRequestException("Missing tenant");
  }
}
