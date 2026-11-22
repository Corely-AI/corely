import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UseFilters,
} from "@nestjs/common";
import {
  CliDayBriefDateSchema,
  CliDayBriefOperation,
  CliGrantScopeSchema,
} from "@corely/contracts";
import type { Request } from "express";
import { CliOperationAccess, SsoExceptionFilter } from "../../identity/public/cli";
import { DailyOperationsBrief } from "../application/daily-operations-brief";

const inputSchema = CliGrantScopeSchema.extend({ date: CliDayBriefDateSchema });

@Controller("sso/cli")
@UseFilters(SsoExceptionFilter)
export class CliDayBriefController {
  constructor(
    @Inject(DailyOperationsBrief) private readonly brief: DailyOperationsBrief,
    @Inject(CliOperationAccess) private readonly access: CliOperationAccess
  ) {}

  @Post("day-brief")
  @HttpCode(200)
  execute(@Req() req: Request, @Body() raw: unknown) {
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException("Choose a workspace and a valid date");
    }
    const { tenantId, workspaceId, date } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliDayBriefOperation.id, (actor) =>
      this.brief.execute(
        { ...scope, userId: actor.userId, workspaceName: actor.workspaceName },
        date
      )
    );
  }
}
