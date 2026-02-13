import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  Delete,
} from "@nestjs/common";
import { SetEntityCustomFieldValuesInputSchema, CustomFieldFilterSchema } from "@corely/contracts";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../identity/adapters/http/current-user.decorator";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import {
  GetEntityCustomFieldValuesUseCase,
  SetEntityCustomFieldValuesUseCase,
  ResolveEntityIdsByCustomFieldFiltersUseCase,
  ListIndexedCustomFieldsUseCase,
  DeleteEntityCustomFieldValuesUseCase,
} from "../application/use-cases/custom-field-values.usecases";

@Controller("platform/custom-fields")
@UseGuards(AuthGuard, RbacGuard)
export class CustomFieldValuesController {
  constructor(
    private readonly getValuesUseCase: GetEntityCustomFieldValuesUseCase,
    private readonly setValuesUseCase: SetEntityCustomFieldValuesUseCase,
    private readonly deleteValuesUseCase: DeleteEntityCustomFieldValuesUseCase,
    private readonly resolveIdsUseCase: ResolveEntityIdsByCustomFieldFiltersUseCase,
    private readonly listIndexedUseCase: ListIndexedCustomFieldsUseCase
  ) {}

  @Get("entities/:entityType/:entityId")
  @RequirePermission("platform.settings.read")
  async getEntityValues(
    @CurrentTenantId() tenantId: string,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string
  ) {
    ensureTenant(tenantId);
    return {
      entityRef: {
        entityType,
        entityId,
      },
      values: await this.getValuesUseCase.execute(tenantId, entityType, entityId),
    };
  }

  @Put("entities/:entityType/:entityId")
  @RequirePermission("platform.settings.write")
  async setEntityValues(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() _userId: string,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Body() body: unknown
  ) {
    ensureTenant(tenantId);
    const parsed = SetEntityCustomFieldValuesInputSchema.parse(body);
    const values = await this.setValuesUseCase.execute(
      tenantId,
      entityType,
      entityId,
      parsed.values
    );
    return {
      entityRef: {
        entityType,
        entityId,
      },
      values,
    };
  }

  @Delete("entities/:entityType/:entityId")
  @RequirePermission("platform.settings.write")
  async deleteEntityValues(
    @CurrentTenantId() tenantId: string,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string
  ) {
    ensureTenant(tenantId);
    await this.deleteValuesUseCase.execute(tenantId, entityType, entityId);
    return { success: true };
  }

  @Get("resolve-entity-ids")
  @RequirePermission("platform.settings.read")
  async resolveEntityIds(
    @CurrentTenantId() tenantId: string,
    @Query("entityType") entityType: string,
    @Query("filters") filters: string
  ) {
    ensureTenant(tenantId);
    const parsedFilters = parseFilterArray(filters);
    const ids = await this.resolveIdsUseCase.execute(tenantId, entityType, parsedFilters);
    return { entityIds: ids };
  }

  @Get("indexed")
  @RequirePermission("platform.settings.read")
  async listIndexedFields(
    @CurrentTenantId() tenantId: string,
    @Query("entityType") entityType: string
  ) {
    ensureTenant(tenantId);
    if (!entityType) {
      throw new BadRequestException("entityType is required");
    }
    return this.listIndexedUseCase.execute(tenantId, entityType);
  }
}

function ensureTenant(tenantId: string) {
  if (!tenantId) {
    throw new BadRequestException("Missing tenant");
  }
}

function parseFilterArray(raw: string | undefined) {
  if (!raw) {
    return [];
  }

  const decoded = JSON.parse(raw);
  if (!Array.isArray(decoded)) {
    throw new BadRequestException("filters must be an array");
  }

  return decoded.map((item) => CustomFieldFilterSchema.parse(item));
}
