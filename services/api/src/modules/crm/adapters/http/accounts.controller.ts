import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { CreateAccountUseCase } from "../../application/use-cases/create-account/create-account.usecase";
import { UpdateAccountUseCase } from "../../application/use-cases/update-account/update-account.usecase";
import { GetAccountUseCase } from "../../application/use-cases/get-account/get-account.usecase";
import { ListAccountsUseCase } from "../../application/use-cases/list-accounts/list-accounts.usecase";
import {
  CreateAccountInputSchema,
  UpdateAccountInputSchema,
  ListAccountsQuerySchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/accounts")
@UseGuards(AuthGuard, RbacGuard)
export class AccountsHttpController {
  constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly updateAccount: UpdateAccountUseCase,
    private readonly getAccount: GetAccountUseCase,
    private readonly listAccounts: ListAccountsUseCase
  ) {}

  @Post()
  @RequirePermission("crm.deals.manage")
  async create(@Req() req: Request, @Body() body: unknown) {
    const input = CreateAccountInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createAccount.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch(":id")
  @RequirePermission("crm.deals.manage")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    const input = UpdateAccountInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.updateAccount.execute({ ...input, id }, ctx);
    return mapResultToHttp(result);
  }

  @Get(":id")
  @RequirePermission("crm.deals.read")
  async get(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getAccount.execute({ id }, ctx);
    return mapResultToHttp(result);
  }

  @Get()
  @RequirePermission("crm.deals.read")
  async list(@Req() req: Request, @Query() query: unknown) {
    const input = ListAccountsQuerySchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const result = await this.listAccounts.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
