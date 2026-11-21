import { GetSignOverviewUseCase, GetSignSettingsUseCase } from "../../application/use-cases";
import { Controller, Get, Header, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toAuthenticatedWorkspaceContext, type ContextAwareRequest } from "../../../../shared/request-context";
@Controller("sign")
@UseGuards(AuthGuard)
export class SignOverviewController {
  constructor(
    private readonly getSignOverview: GetSignOverviewUseCase,
    private readonly getSignSettings: GetSignSettingsUseCase
  ) {}
  @Get("overview")
  @Header("Cache-Control", "private, no-store")
  overview(@Req() req: ContextAwareRequest) {
    return this.getSignOverview.execute(toAuthenticatedWorkspaceContext(req));
  }
  @Get("settings")
  @Header("Cache-Control", "private, no-store")
  settings(@Req() req: ContextAwareRequest) {
    return this.getSignSettings.execute(toAuthenticatedWorkspaceContext(req));
  }
}
