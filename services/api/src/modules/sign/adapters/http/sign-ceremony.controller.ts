import {
  AcceptSignRequestUseCase,
  DeclineSignRequestUseCase,
  DownloadSignArtifactUseCase,
  ExchangeSignInvitationUseCase,
  GetSignRequestProgressUseCase,
  PreviewSignAcceptanceUseCase,
  ReadSignRequestSourceUseCase,
  RemindSignRecipientUseCase,
  RetrySignFinalizationUseCase,
  ReviewSignRequestUseCase,
  SaveRecipientProgressUseCase,
  SendSignRequestUseCase,
  VoidSignRequestUseCase,
} from "../../application/use-cases";
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toAuthenticatedWorkspaceContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { SigningRateGuard } from "./signing-rate.guard";
import { InvitationSecrets } from "../../application/ports/invitation-secrets";

@Controller("sign/requests/:id")
@UseGuards(AuthGuard)
export class ManageCeremonyController {
  constructor(
    private readonly sendSignRequest: SendSignRequestUseCase,
    private readonly readSignRequestSource: ReadSignRequestSourceUseCase,
    private readonly getSignRequestProgress: GetSignRequestProgressUseCase,
    private readonly voidSignRequest: VoidSignRequestUseCase,
    private readonly remindSignRecipient: RemindSignRecipientUseCase,
    private readonly retrySignFinalization: RetrySignFinalizationUseCase,
    private readonly downloadSignArtifact: DownloadSignArtifactUseCase
  ) {}
  @Get("source") @Header("Cache-Control", "private, no-store") source(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string
  ) {
    return this.readSignRequestSource.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Get("evidence") @Header("Cache-Control", "private, no-store") evidence(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string
  ) {
    return this.downloadSignArtifact.execute(toAuthenticatedWorkspaceContext(req), id, "evidence");
  }
  @Get("artifact") @Header("Cache-Control", "private, no-store") download(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string
  ) {
    return this.downloadSignArtifact.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Post("retry") retry(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.retrySignFinalization.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Get("progress")
  @Header("Cache-Control", "private, no-store")
  state(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.getSignRequestProgress.execute(toAuthenticatedWorkspaceContext(req), id);
  }
  @Post("send") send(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    return this.sendSignRequest.execute(toAuthenticatedWorkspaceContext(req), id, body);
  }
  @Post("remind/:role") remind(
    @Req() req: ContextAwareRequest,
    @Param("id") id: string,
    @Param("role") role: string,
    @Body() body: { commandId: string }
  ) {
    return this.remindSignRecipient.execute(toAuthenticatedWorkspaceContext(req), id, role, body?.commandId);
  }
  @Post("void") void(@Req() req: ContextAwareRequest, @Param("id") id: string) {
    return this.voidSignRequest.execute(toAuthenticatedWorkspaceContext(req), id);
  }
}
function checkOrigin(req: Request, origin: string) {
  if (req.headers.origin !== origin || req.headers["x-sign-action"] !== "1") {
    throw new ForbiddenException("Invalid signing origin");
  }
}
const cookie = "corely_sign_session";
function session(req: Request, origin: string) {
  checkOrigin(req, origin);
  return (
    /(?:^|;\s*)corely_sign_session=([a-zA-Z0-9_-]{43})(?:;|$)/.exec(
      req.headers.cookie ?? ""
    )?.[1] ?? ""
  );
}
@Controller("public/signing")
@UseGuards(SigningRateGuard)
export class PublicCeremonyController {
  constructor(
    private readonly exchangeSignInvitation: ExchangeSignInvitationUseCase,
    private readonly reviewSignRequest: ReviewSignRequestUseCase,
    private readonly saveRecipientProgress: SaveRecipientProgressUseCase,
    private readonly previewSignAcceptance: PreviewSignAcceptanceUseCase,
    private readonly acceptSignRequest: AcceptSignRequestUseCase,
    private readonly declineSignRequest: DeclineSignRequestUseCase,
    private readonly secrets: InvitationSecrets
  ) {}
  @Post("exchange")
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  async exchange(
    @Req() req: Request,
    @Body() body: { token?: unknown },
    @Res({ passthrough: true }) res: Response
  ) {
    const origin = this.secrets.publicOrigin();
    checkOrigin(req, origin);
    const { session, until } = await this.exchangeSignInvitation.execute(
      typeof body?.token === "string" ? body.token : ""
    );
    res.cookie(cookie, session, {
      httpOnly: true,
      sameSite: "strict",
      secure: origin.startsWith("https:"),
      expires: until,
      path: "/api/signing",
    });
    return { ok: true };
  }
  @Post("review")
  @Header("Cache-Control", "no-store")
  read(@Req() req: Request) {
    return this.reviewSignRequest.execute(session(req, this.secrets.publicOrigin()));
  }
  @Post("progress") @Header("Cache-Control", "no-store") progress(
    @Req() req: Request,
    @Body() body: unknown
  ) {
    return this.saveRecipientProgress.execute(session(req, this.secrets.publicOrigin()), body);
  }
  @Post("prepare") @Header("Cache-Control", "no-store") prepare(
    @Req() req: Request,
    @Body() body: unknown
  ) {
    return this.previewSignAcceptance.execute(session(req, this.secrets.publicOrigin()), body);
  }
  @Post("accept")
  @Header("Cache-Control", "no-store")
  complete(@Req() req: Request, @Body() body: unknown) {
    return this.acceptSignRequest.execute(session(req, this.secrets.publicOrigin()), body);
  }
  @Post("decline")
  @Header("Cache-Control", "no-store")
  decline(@Req() req: Request) {
    return this.declineSignRequest.execute(session(req, this.secrets.publicOrigin()));
  }
}
