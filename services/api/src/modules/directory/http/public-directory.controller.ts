import { Body, Controller, Get, Header, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateDirectoryLeadRequestSchema,
  CreateDirectoryLeadResponseSchema,
  DIRECTORY_ERROR_CODES,
  DirectoryRestaurantDetailResponseSchema,
  DirectoryRestaurantListQuerySchema,
  DirectoryRestaurantListResponseSchema,
} from "@corely/contracts";
import { ValidationError, type UseCaseContext } from "@corely/kernel";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "@/shared/http/usecase-mappers";
import { DirectoryPublicScopeResolver } from "../application/directory-public-scope.resolver";
import { CreateLeadCommandUseCase } from "../application/use-cases/create-lead-command.usecase";
import { GetRestaurantBySlugQueryUseCase } from "../application/use-cases/get-restaurant-by-slug-query.usecase";
import { ListRestaurantsQueryUseCase } from "../application/use-cases/list-restaurants-query.usecase";

@Controller("v1/public/berlin")
export class PublicDirectoryController {
  constructor(
    private readonly publicScopeResolver: DirectoryPublicScopeResolver,
    private readonly listRestaurantsQueryUseCase: ListRestaurantsQueryUseCase,
    private readonly getRestaurantBySlugQueryUseCase: GetRestaurantBySlugQueryUseCase,
    private readonly createLeadCommandUseCase: CreateLeadCommandUseCase
  ) {}

  @Get("restaurants")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async listRestaurants(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = DirectoryRestaurantListQuerySchema.parse(query);
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.listRestaurantsQueryUseCase.execute(input, ctx);

    return DirectoryRestaurantListResponseSchema.parse(mapResultToHttp(result));
  }

  @Get("restaurants/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async getRestaurantBySlug(@Param("slug") slug: string, @Req() req: Request) {
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.getRestaurantBySlugQueryUseCase.execute({ slug }, ctx);

    return DirectoryRestaurantDetailResponseSchema.parse(mapResultToHttp(result));
  }

  @Post("leads")
  async createLead(@Body() body: unknown, @Req() req: Request) {
    const idempotencyKey = resolveIdempotencyKey(req);

    if (!idempotencyKey) {
      throw new ValidationError(
        "Idempotency-Key header is required",
        undefined,
        DIRECTORY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED
      );
    }

    const input = CreateDirectoryLeadRequestSchema.parse(body);
    const ctx = this.withDirectoryScope(buildUseCaseContext(req));
    const result = await this.createLeadCommandUseCase.execute({ input, idempotencyKey }, ctx);

    return CreateDirectoryLeadResponseSchema.parse(mapResultToHttp(result));
  }

  private withDirectoryScope(ctx: UseCaseContext): UseCaseContext {
    const scope = this.publicScopeResolver.resolveScope();

    return {
      ...ctx,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    };
  }
}
