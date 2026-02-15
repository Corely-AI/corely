import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { CreateAccountUseCase } from "../../application/use-cases/create-account/create-account.usecase";
import { UpdateAccountUseCase } from "../../application/use-cases/update-account/update-account.usecase";
import { GetAccountUseCase } from "../../application/use-cases/get-account/get-account.usecase";
import { ListAccountsUseCase } from "../../application/use-cases/list-accounts/list-accounts.usecase";
import { SetAccountCustomAttributesUseCase } from "../../application/use-cases/set-account-custom-attributes/set-account-custom-attributes.usecase";
import { GetAccountCustomAttributesUseCase } from "../../application/use-cases/get-account-custom-attributes/get-account-custom-attributes.usecase";
import {
  CreateAccountInputSchema,
  UpdateAccountInputSchema,
  ListAccountsQuerySchema,
  SetAccountCustomAttributesInputSchema,
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
    private readonly setCustomAttributes: SetAccountCustomAttributesUseCase,
    private readonly getCustomAttributes: GetAccountCustomAttributesUseCase,
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
  async update(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const input = UpdateAccountInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.updateAccount.execute({ ...input, id }, ctx);
    return mapResultToHttp(result);
  }

  @Put(":id/custom-attributes")
  @RequirePermission("crm.deals.manage")
  async setAccountCustomAttributes(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    const input = SetAccountCustomAttributesInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.setCustomAttributes.execute(
      {
        id,
        customFieldValues: input.customFieldValues ?? {},
        dimensionAssignments: (input.dimensionAssignments ?? []).map((assignment) => ({
          typeId: assignment.typeId ?? "",
          valueIds: assignment.valueIds ?? [],
        })),
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Get(":id/custom-attributes")
  @RequirePermission("crm.deals.read")
  async getAccountCustomAttributes(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getCustomAttributes.execute({ id }, ctx);
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
