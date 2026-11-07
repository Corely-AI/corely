import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthorizeWorkspaceUseCase } from "../../application/use-cases/authorize-workspace.usecase";
import { buildUseCaseContext } from "../../../../shared/http/usecase-mappers";

/** Runs before the legacy idempotency interceptor can return a cached publication response. */
@Injectable()
export class WorkspacePublicationGuard implements CanActivate {
  constructor(private readonly authorize: AuthorizeWorkspaceUseCase) {}
  async canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<Request<{ workspaceId: string }, unknown, unknown>>();
    const body = req.body;
    if (body && typeof body === "object" && ("publicEnabled" in body || "publicModules" in body)) {
      const ctx = buildUseCaseContext(req);
      if (!ctx.tenantId || !ctx.userId) {
        throw new ForbiddenException("Authenticated workspace context required");
      }
      await this.authorize.execute({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        workspaceId: req.params.workspaceId,
        manage: true,
      });
    }
    return true;
  }
}
