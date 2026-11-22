import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseFilters,
} from "@nestjs/common";
import {
  CliDayBriefDateSchema,
  CliDayBriefOperation,
  CliGrantScopeSchema,
  SsoHandleSchema,
} from "@corely/contracts";
import type { Request } from "express";
import {
  CliAgentGrantsService,
  SsoExceptionFilter,
  SsoHttpSecurity,
  SsoSessionService,
  cliAgentCredential,
  cliBearer,
} from "../../identity/public/cli";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { DailyOperationsBrief } from "../application/daily-operations-brief";

const inputSchema = CliGrantScopeSchema.extend({ date: CliDayBriefDateSchema });

@Controller("sso/cli")
@UseFilters(SsoExceptionFilter)
export class CliDayBriefController {
  constructor(
    private readonly brief: DailyOperationsBrief,
    private readonly grants: CliAgentGrantsService,
    private readonly sessions: SsoSessionService,
    private readonly security: SsoHttpSecurity,
    private readonly workspaces: AuthorizeWorkspaceUseCase
  ) {}

  @Post("day-brief")
  @HttpCode(200)
  async execute(@Req() req: Request, @Body() raw: unknown) {
    this.security.origin(req, true);
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException("Choose a workspace and a valid date");
    }
    const { tenantId, workspaceId, date } = parsed.data;
    const scope = { tenantId, workspaceId };
    const token = cliBearer(req);
    if (token.startsWith("corely-agent.")) {
      return this.grants.useOperation(
        scope,
        cliAgentCredential(req),
        CliDayBriefOperation.id,
        (actor) =>
          this.brief.execute(
            { ...scope, userId: actor.userId, workspaceName: actor.workspaceName },
            date
          )
      );
    }
    if (!SsoHandleSchema.safeParse(token).success) {
      throw new UnauthorizedException("CLI credential required");
    }
    const userId = await this.sessions.authenticateCli(token);
    await this.sessions.principal(userId, tenantId);
    const workspace = await this.workspaces.execute({ ...scope, userId, manage: true });
    return this.brief.execute({ ...scope, userId, workspaceName: workspace.name }, date);
  }
}
