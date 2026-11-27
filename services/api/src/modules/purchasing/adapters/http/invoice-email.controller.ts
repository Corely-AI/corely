import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UpdateInvoiceEmailSettingsSchema } from "@corely/contracts";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "@/modules/identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import {
  toAuthenticatedWorkspaceContext,
  type ContextAwareRequest,
} from "../../../../shared/request-context";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";
import { UseCaseError } from "@corely/kernel";
import { InvoiceEmailIntake } from "../../application/invoice-email-intake";

@Controller("purchasing/invoice-email")
@UseGuards(AuthGuard, WorkspaceCapabilityGuard, RbacGuard)
@RequireWorkspaceCapability("purchasing.purchaseOrders")
export class InvoiceEmailController {
  constructor(
    private readonly intake: InvoiceEmailIntake,
    private readonly authorizeWorkspace: AuthorizeWorkspaceUseCase
  ) {}

  @Get("settings")
  async getSettings(@Req() req: ContextAwareRequest) {
    const scope = await this.authorize(req, true);
    return this.intake.getSettings(scope);
  }

  @Patch("settings")
  async setSettings(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const { enabled } = UpdateInvoiceEmailSettingsSchema.parse(body);
    const scope = await this.authorize(req, true);
    try {
      return await this.intake.setEnabled(scope, scope.userId, enabled);
    } catch (error) {
      throw error instanceof UseCaseError ? toHttpException(error) : error;
    }
  }

  @Get("bills/:billId/original")
  @Header("Cache-Control", "no-store")
  @RequirePermission("purchasing.read")
  async getOriginal(@Req() req: ContextAwareRequest, @Param("billId") billId: string) {
    const scope = await this.authorize(req, false);
    try {
      return await this.intake.original(scope, billId);
    } catch (error) {
      throw error instanceof UseCaseError ? toHttpException(error) : error;
    }
  }

  private async authorize(req: ContextAwareRequest, manage: boolean) {
    const { tenantId, workspaceId, userId, tenantAdminRoleId } =
      toAuthenticatedWorkspaceContext(req);
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Workspace access denied");
    }
    await this.authorizeWorkspace.execute({
      tenantId,
      workspaceId,
      userId,
      tenantAdminRoleId,
      manage,
    });
    return { tenantId, workspaceId, userId };
  }
}
