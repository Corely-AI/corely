import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "./auth.guard";
import { RbacGuard, RequirePermission } from "./rbac.guard";
import { ListTenantsUseCase } from "../../application/use-cases/list-tenants.usecase";
import { CreateTenantUseCase } from "../../application/use-cases/create-tenant.usecase";
import {
  CreateTenantInputSchema,
  CreateTenantUserInputSchema,
  ListTenantsInputSchema,
  UpdateTenantUserRoleInputSchema,
  UpdateTenantInputSchema,
} from "@corely/contracts";
import {
  buildUseCaseContext,
  resolveIdempotencyKey,
} from "../../../../shared/http/usecase-mappers";
import { ListTenantUsersUseCase } from "../../application/use-cases/list-tenant-users.usecase";
import { CreateTenantUserUseCase } from "../../application/use-cases/create-tenant-user.usecase";
import { UpdateTenantUserRoleUseCase } from "../../application/use-cases/update-tenant-user-role.usecase";
import { UpdateTenantUseCase } from "../../application/use-cases/update-tenant.usecase";
import { GetTenantUseCase } from "../../application/use-cases/get-tenant.usecase";
import { parseListQuery } from "../../../../shared/http/pagination";

@Controller("platform/tenants")
@UseGuards(AuthGuard, RbacGuard)
export class TenantsController {
  constructor(
    @Inject(ListTenantsUseCase) private readonly listTenantsUseCase: ListTenantsUseCase,
    @Inject(CreateTenantUseCase) private readonly createTenantUseCase: CreateTenantUseCase,
    @Inject(ListTenantUsersUseCase)
    private readonly listTenantUsersUseCase: ListTenantUsersUseCase,
    @Inject(CreateTenantUserUseCase)
    private readonly createTenantUserUseCase: CreateTenantUserUseCase,
    @Inject(UpdateTenantUserRoleUseCase)
    private readonly updateTenantUserRoleUseCase: UpdateTenantUserRoleUseCase,
    @Inject(UpdateTenantUseCase)
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    @Inject(GetTenantUseCase)
    private readonly getTenantUseCase: GetTenantUseCase
  ) {}

  @Get()
  @RequirePermission("platform.tenants.read")
  async list(@Query() query: any, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const parsed = parseListQuery(query, { defaultPageSize: 20, maxPageSize: 100 });
    const statusFromFilters = Array.isArray(parsed.filters)
      ? parsed.filters.find((filter) => filter.field === "status" && filter.operator === "eq")
      : undefined;

    const input = ListTenantsInputSchema.parse({
      ...parsed,
      status:
        typeof query.status === "string"
          ? query.status
          : typeof statusFromFilters?.value === "string"
            ? statusFromFilters.value
            : undefined,
    });

    return await this.listTenantsUseCase.execute(
      {
        actorUserId: ctx.userId ?? "unknown",
        q: input.q,
        page: input.page,
        pageSize: input.pageSize,
        sort: input.sort,
        status: input.status,
      },
      ctx
    );
  }

  @Get(":tenantId")
  @RequirePermission("platform.tenants.read")
  async get(@Param("tenantId") tenantId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    return await this.getTenantUseCase.execute({ tenantId }, ctx);
  }

  @Post()
  @RequirePermission("platform.tenants.write")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateTenantInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    return await this.createTenantUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );
  }

  @Patch(":tenantId")
  @RequirePermission("platform.tenants.write")
  async update(@Param("tenantId") tenantId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateTenantInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    return await this.updateTenantUseCase.execute({ tenantId, input }, ctx);
  }

  @Get(":tenantId/users")
  @RequirePermission("platform.tenants.read")
  async listUsers(@Param("tenantId") tenantId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    return await this.listTenantUsersUseCase.execute({ tenantId }, ctx);
  }

  @Post(":tenantId/users")
  @RequirePermission("platform.tenants.write")
  async createUser(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreateTenantUserInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    return await this.createTenantUserUseCase.execute(
      {
        ...input,
        tenantId,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );
  }

  @Patch(":tenantId/users/:membershipId/role")
  @RequirePermission("platform.tenants.write")
  async updateUserRole(
    @Param("tenantId") tenantId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateTenantUserRoleInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    return await this.updateTenantUserRoleUseCase.execute(
      { tenantId, membershipId, roleId: input.roleId },
      ctx
    );
  }
}
