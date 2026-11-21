import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { toAuthenticatedWorkspaceContext, type ContextAwareRequest } from "../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { NativeCoachingAgreements } from "../application/native-agreements";
@Controller("coaching-engagements")
@UseGuards(AuthGuard)
export class NativeAgreementsController {
  constructor(private readonly agreements: NativeCoachingAgreements) {}
  @Post(":id/sign-requests") prepare(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    return this.agreements.prepare(toAuthenticatedWorkspaceContext(req), id, body, resolveIdempotencyKey(req));
  }
}
