import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  AdminDirectoryRestaurantDetailResponseSchema,
  AdminDirectoryRestaurantIdParamSchema,
  AdminDirectoryRestaurantListQuerySchema,
  AdminDirectoryRestaurantListResponseSchema,
  CreateAdminDirectoryRestaurantRequestSchema,
  CreateAdminDirectoryRestaurantResponseSchema,
  DIRECTORY_ERROR_CODES,
  SetRestaurantStatusRequestSchema,
  SetRestaurantStatusResponseSchema,
  UpdateAdminDirectoryRestaurantRequestSchema,
  UpdateAdminDirectoryRestaurantResponseSchema,
} from "@corely/contracts";
import { ValidationError, type UseCaseContext } from "@corely/kernel";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "@/shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { DirectoryPublicScopeResolver } from "../application/directory-public-scope.resolver";
import { AdminCreateRestaurantCommandUseCase } from "../application/use-cases/admin-create-restaurant-command.usecase";
import { AdminGetRestaurantByIdQueryUseCase } from "../application/use-cases/admin-get-restaurant-by-id-query.usecase";
import { AdminListRestaurantsQueryUseCase } from "../application/use-cases/admin-list-restaurants-query.usecase";
import { AdminSetRestaurantStatusCommandUseCase } from "../application/use-cases/admin-set-restaurant-status-command.usecase";
import { AdminUpdateRestaurantCommandUseCase } from "../application/use-cases/admin-update-restaurant-command.usecase";
import { DIRECTORY_PERMISSIONS } from "../policies/directory.policies";
import { z } from "zod";

@Controller("v1/admin/directory/restaurants")
@UseGuards(AuthGuard, RbacGuard)
export class AdminDirectoryController {
  constructor(
    private readonly publicScopeResolver: DirectoryPublicScopeResolver,
    private readonly listRestaurantsQueryUseCase: AdminListRestaurantsQueryUseCase,
    private readonly getRestaurantByIdQueryUseCase: AdminGetRestaurantByIdQueryUseCase,
    private readonly createRestaurantCommandUseCase: AdminCreateRestaurantCommandUseCase,
    private readonly updateRestaurantCommandUseCase: AdminUpdateRestaurantCommandUseCase,
    private readonly setRestaurantStatusCommandUseCase: AdminSetRestaurantStatusCommandUseCase
  ) {}

  @Get()
  @RequirePermission(DIRECTORY_PERMISSIONS.manageRestaurants)
  async listRestaurants(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = this.parseOrThrow(AdminDirectoryRestaurantListQuerySchema, query);
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.listRestaurantsQueryUseCase.execute(input, ctx);

    return AdminDirectoryRestaurantListResponseSchema.parse(mapResultToHttp(result));
  }

  @Get(":id")
  @RequirePermission(DIRECTORY_PERMISSIONS.manageRestaurants)
  async getRestaurantById(@Param("id") id: string, @Req() req: Request) {
    this.parseOrThrow(AdminDirectoryRestaurantIdParamSchema, { id });
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.getRestaurantByIdQueryUseCase.execute({ id }, ctx);

    return AdminDirectoryRestaurantDetailResponseSchema.parse(mapResultToHttp(result));
  }

  @Post()
  @Header("Cache-Control", "no-store")
  @RequirePermission(DIRECTORY_PERMISSIONS.manageRestaurants)
  async createRestaurant(@Body() body: unknown, @Req() req: Request) {
    const idempotencyKey = resolveIdempotencyKey(req);

    if (!idempotencyKey) {
      throw new ValidationError(
        "Idempotency-Key header is required",
        undefined,
        DIRECTORY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED
      );
    }

    const input = this.parseOrThrow(CreateAdminDirectoryRestaurantRequestSchema, body);
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.createRestaurantCommandUseCase.execute(
      { input, idempotencyKey },
      ctx
    );

    return CreateAdminDirectoryRestaurantResponseSchema.parse(mapResultToHttp(result));
  }

  @Patch(":id")
  @Header("Cache-Control", "no-store")
  @RequirePermission(DIRECTORY_PERMISSIONS.manageRestaurants)
  async updateRestaurant(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    this.parseOrThrow(AdminDirectoryRestaurantIdParamSchema, { id });
    const patch = this.parseOrThrow(UpdateAdminDirectoryRestaurantRequestSchema, body);
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.updateRestaurantCommandUseCase.execute({ id, patch }, ctx);

    return UpdateAdminDirectoryRestaurantResponseSchema.parse(mapResultToHttp(result));
  }

  @Patch(":id/status")
  @Header("Cache-Control", "no-store")
  @RequirePermission(DIRECTORY_PERMISSIONS.manageRestaurants)
  async setRestaurantStatus(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    this.parseOrThrow(AdminDirectoryRestaurantIdParamSchema, { id });
    const input = this.parseOrThrow(SetRestaurantStatusRequestSchema, body);
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.setRestaurantStatusCommandUseCase.execute(
      { id, status: input.status },
      ctx
    );

    return SetRestaurantStatusResponseSchema.parse(mapResultToHttp(result));
  }

  private withDirectoryScope(ctx: UseCaseContext): UseCaseContext {
    const scope = this.publicScopeResolver.resolveScope();

    return {
      ...ctx,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    };
  }

  private parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
    const parsed = schema.safeParse(input);
    if (parsed.success) {
      return parsed.data;
    }

    throw new ValidationError(
      "Validation failed",
      parsed.error.issues.map((issue) => ({
        message: issue.message,
        members: issue.path.map((segment) => String(segment)),
      })),
      DIRECTORY_ERROR_CODES.VALIDATION_FAILED
    );
  }
}
