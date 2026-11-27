import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { getSsoSessionPrincipal } from "../../identity/adapters/http/sso-session-principal";
import { GetWorkspacePermissionsUseCase } from "../../identity/public";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import {
  toAuthenticatedWorkspaceContext,
  type ContextAwareRequest,
} from "../../../shared/request-context";
import { expensePermissions } from "../application/expense-receipt-permissions";
import { isEmailedExpense } from "../domain/emailed-expense";

export type ReceiptAccessRequest = ContextAwareRequest & {
  includeEmailedExpenses?: boolean;
  canManageEmailedExpense?: boolean;
};

@Injectable()
export class ExpenseReceiptAccessGuard implements CanActivate {
  constructor(
    private readonly auth: AuthGuard,
    private readonly permissions: GetWorkspacePermissionsUseCase,
    private readonly authorize: AuthorizeWorkspaceUseCase
  ) {}

  async canActivate(execution: ExecutionContext) {
    const req = execution.switchToHttp().getRequest<ReceiptAccessRequest>();
    const id = req.params.expenseId;
    const isReceipt = typeof id === "string" && isEmailedExpense(id);
    const isAuthenticatedList =
      req.method === "GET" && !id && (req.headers.authorization || getSsoSessionPrincipal(req));

    if (!isReceipt && !isAuthenticatedList) {
      return true;
    }
    await this.auth.canActivate(execution);
    const context = toAuthenticatedWorkspaceContext(req);
    const { read, write } = expensePermissions(
      (await this.permissions.execute(context)).permissions
    );
    const scoped = Boolean(context.tenantId && context.workspaceId && context.userId);
    req.includeEmailedExpenses = scoped && read;
    if (isReceipt) {
      const { tenantId, workspaceId, userId, tenantAdminRoleId } = context;
      if (!tenantId || !workspaceId || !userId || !read) {
        throw new ForbiddenException("Expense receipt access denied");
      }
      const { canManage } = await this.authorize.execute({
        tenantId,
        workspaceId,
        userId,
        tenantAdminRoleId,
      });
      req.canManageEmailedExpense = Boolean(canManage && write);
      if (req.method !== "GET" && !req.canManageEmailedExpense) {
        throw new ForbiddenException("A workspace reviewer must manage submitted receipt expenses");
      }
    }
    return true;
  }
}
