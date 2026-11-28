import { Body, Controller, Header, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  AcceptPilotWorkspaceInviteInputSchema,
  CreatePilotInviteInputSchema,
  StartPilotWorkspaceInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { buildUseCaseContext } from "../../../../shared/http/usecase-mappers";
import { PilotSetupUseCase } from "../../application/use-cases/pilot-setup.usecase";

@Controller("workspaces")
@UseGuards(AuthGuard)
export class PilotSetupController {
  constructor(private readonly app: PilotSetupUseCase) {}
  @Post("pilot-setup/start")
  start(@Body() body: unknown, @Req() req: Request) {
    return this.app.start(StartPilotWorkspaceInputSchema.parse(body), buildUseCaseContext(req));
  }
  @Post(":workspaceId/pilot-setup/invites")
  @Header("Cache-Control", "no-store")
  invite(@Param("workspaceId") workspaceId: string, @Body() body: unknown, @Req() req: Request) {
    return this.app.invite(
      workspaceId,
      CreatePilotInviteInputSchema.parse(body).email,
      buildUseCaseContext(req)
    );
  }
  @Post("pilot-setup/invites/accept")
  @Header("Cache-Control", "no-store")
  accept(@Body() body: unknown, @Req() req: Request) {
    return this.app.accept(
      AcceptPilotWorkspaceInviteInputSchema.parse(body).token,
      buildUseCaseContext(req)
    );
  }
}
