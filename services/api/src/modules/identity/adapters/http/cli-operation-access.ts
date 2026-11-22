import { SsoHandleSchema } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { CliAgentGrantsService } from "../../application/services/cli-agent-grants.service";
import { SsoSessionService } from "../../application/services/sso-session.service";
import { cliAgentCredential, cliBearer } from "./cli-agent.controller";
import { SsoHttpSecurity } from "./sso-http-security";

export type CliOperationActor = { userId: string; workspaceName: string; agentId?: string };

@Injectable()
export class CliOperationAccess {
  constructor(
    @Inject(CliAgentGrantsService) private readonly grants: CliAgentGrantsService,
    @Inject(SsoSessionService) private readonly sessions: SsoSessionService,
    @Inject(SsoHttpSecurity) private readonly security: SsoHttpSecurity,
    @Inject(AuthorizeWorkspaceUseCase) private readonly workspaces: AuthorizeWorkspaceUseCase
  ) {}

  async run<T>(
    req: Request,
    scope: { tenantId: string; workspaceId: string },
    operation: string,
    work: (actor: CliOperationActor, transaction?: TransactionContext) => Promise<T>
  ) {
    this.security.origin(req, true);
    const token = cliBearer(req);
    if (token.startsWith("corely-agent.")) {
      return this.grants.useOperation(scope, cliAgentCredential(req), operation, work);
    }
    if (!SsoHandleSchema.safeParse(token).success) {
      throw new UnauthorizedException("CLI credential required");
    }
    const userId = await this.sessions.authenticateCli(token);
    await this.sessions.principal(userId, scope.tenantId);
    const workspace = await this.workspaces.execute({ ...scope, userId, manage: true });
    return work({ userId, workspaceName: workspace.name });
  }
}
