import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  AssignExpenseReceiptSchema,
  SetExpenseReceiptEmailSchema,
  UpdateExpenseReceiptDraftSchema,
} from "@corely/contracts";
import { UseCaseError } from "@corely/kernel";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { GetWorkspacePermissionsUseCase } from "../../identity/public";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import {
  toAuthenticatedWorkspaceContext,
  type ContextAwareRequest,
} from "../../../shared/request-context";
import { toHttpException } from "../../../shared/http/usecase-error.mapper";
import { ExpenseReceiptEmail } from "../application/expense-receipt-email";
import { expensePermissions } from "../application/expense-receipt-permissions";

@Controller("expense-receipts")
@UseGuards(AuthGuard)
export class ExpenseReceiptEmailController {
  constructor(
    private readonly receipts: ExpenseReceiptEmail,
    private readonly authorize: AuthorizeWorkspaceUseCase,
    private readonly permissions: GetWorkspacePermissionsUseCase
  ) {}

  @Get("settings")
  @Header("Cache-Control", "no-store")
  async settings(@Req() req: ContextAwareRequest) {
    const { actor, slug } = await this.actor(req);
    return this.receipts.settings(actor, slug);
  }

  @Patch("settings")
  async setSettings(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const { actor, slug } = await this.actor(req);
    const { enabled } = this.parse(SetExpenseReceiptEmailSchema, body);
    return this.run(() => this.receipts.setEnabled(actor, slug, enabled));
  }

  @Post("settings/personal-address")
  @Header("Cache-Control", "no-store")
  async personalAddress(@Req() req: ContextAwareRequest) {
    const { actor, slug } = await this.actor(req);
    return this.run(() => this.receipts.enablePersonal(actor, slug));
  }

  @Get()
  @Header("Cache-Control", "no-store")
  async list(@Req() req: ContextAwareRequest, @Query("after") after?: string) {
    return this.receipts.list((await this.actor(req)).actor, after);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  async get(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    const { actor } = await this.actor(req);
    return this.run(() => this.receipts.get(actor, id));
  }

  @Get(":id/original")
  @Header("Cache-Control", "no-store")
  async original(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    const { actor } = await this.actor(req);
    return this.run(() => this.receipts.original(actor, id));
  }

  @Patch(":id")
  async update(@Req() req: ContextAwareRequest, @Param("id") id: string, @Body() body: unknown) {
    const { actor } = await this.actor(req);
    const { submit, ...fields } = this.parse(UpdateExpenseReceiptDraftSchema, body);
    return this.run(() => this.receipts.update(actor, id, fields, submit));
  }

  @Post(":id/assignment")
  async assign(@Req() req: ContextAwareRequest, @Param("id") id: string, @Body() body: unknown) {
    const { actor } = await this.actor(req);
    const { userId } = this.parse(AssignExpenseReceiptSchema, body);
    return this.run(() => this.receipts.assign(actor, id, userId));
  }

  private async actor(req: ContextAwareRequest) {
    const ctx = toAuthenticatedWorkspaceContext(req);
    const { tenantId, workspaceId, userId, tenantAdminRoleId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Select an authorized workspace");
    }
    const { slug, canManage } = await this.authorize.execute({
      tenantId,
      workspaceId,
      userId,
      tenantAdminRoleId,
    });
    const permissions = expensePermissions((await this.permissions.execute(ctx)).permissions);
    if (!permissions.read) {
      throw new ForbiddenException("Expense read permission required");
    }
    return {
      actor: {
        tenantId,
        workspaceId,
        userId,
        canReview: Boolean(canManage),
        canWrite: permissions.write,
      },
      slug,
    };
  }

  private parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map(({ message }) => message));
    }
    return result.data;
  }

  private async run<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      throw error instanceof UseCaseError ? toHttpException(error) : error;
    }
  }
}
