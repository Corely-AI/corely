import {
  Inject,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  BadRequestException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  SsoHandleSchema,
  SsoLoginInputSchema,
  SsoStartInputSchema,
  SsoEmailCodeRequestSchema,
  SsoEmailCodeVerifySchema,
} from "@corely/contracts";
import { SsoEmailCodeService } from "../../application/services/sso-email-code.service";
import { SsoService, SSO_ABSOLUTE_MS } from "../../application/services/sso.service";
import { SSO_COOKIES, SsoHttpSecurity } from "./sso-http-security";
import { SsoExceptionFilter } from "./sso-exception.filter";

const callbackSchema = z
  .object({ request: SsoHandleSchema, code: SsoHandleSchema, state: SsoHandleSchema })
  .strict();
function requestId(value: unknown): string {
  const result = SsoHandleSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException("Invalid request");
  }
  return result.data;
}

@Controller()
@UseFilters(SsoExceptionFilter)
export class SsoController {
  constructor(
    @Inject(SsoService) private readonly sso: SsoService,
    @Inject(SsoHttpSecurity) private readonly security: SsoHttpSecurity,
    @Inject(SsoEmailCodeService) private readonly emailCodes: SsoEmailCodeService
  ) {}

  @Get("api/session/preauth")
  preauth(@Req() req: Request, @Res() res: Response) {
    const origin = this.security.origin(req);
    const result = this.sso.bootstrap(origin, this.security.cookie(req, SSO_COOKIES.preauth));
    this.security.headers(res);
    this.security.setCookie(res, SSO_COOKIES.preauth, result.handle, 300_000);
    res.json({ csrfToken: result.csrfToken });
  }
  @Post("api/session/login")
  async start(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const origin = this.security.mutation(req);
    const parsed = SsoStartInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid request");
    }
    const redirectTo = await this.sso.start(
      origin,
      this.security.cookie(req, SSO_COOKIES.preauth),
      parsed.data.csrfToken,
      parsed.data.returnPath,
      req.socket.remoteAddress ?? "unknown"
    );
    this.security.headers(res);
    res.json({ redirectTo });
  }
  @Get("sso/authorize")
  async authorize(@Query("request") request: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.origin(req, true);
    const id = requestId(request);
    const redirectTo = await this.sso.authorize(id, this.security.cookie(req, SSO_COOKIES.central));
    this.security.headers(res);
    res.redirect(303, redirectTo ?? `${this.sso.registrations.loginOrigin}/login?request=${id}`);
  }
  @Get("sso/context")
  async context(@Query("request") request: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.origin(req, true);
    const result = await this.sso.context(
      requestId(request),
      this.security.cookie(req, SSO_COOKIES.loginPreauth)
    );
    this.security.headers(res);
    this.security.setCookie(res, SSO_COOKIES.loginPreauth, result.handle, 300_000);
    res.json({
      appKey: result.appKey,
      appOrigin: result.appOrigin,
      accountOrigin: result.accountOrigin,
      csrfToken: result.csrfToken,
      expiresAt: result.expiresAt,
    });
  }
  @Post("sso/login")
  async login(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.mutation(req, true);
    const parsed = SsoLoginInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid sign-in fields");
    }
    const { requestId, csrfToken, email, password } = parsed.data;
    if (!requestId || !csrfToken || !email || !password) {
      throw new BadRequestException("Invalid sign-in fields");
    }
    const result = await this.sso.login(
      { requestId, csrfToken, email, password },
      this.security.cookie(req, SSO_COOKIES.loginPreauth),
      this.security.cookie(req, SSO_COOKIES.central)
    );
    this.security.headers(res);
    this.security.setCookie(res, SSO_COOKIES.central, result.centralHandle, SSO_ABSOLUTE_MS);
    res.json({ redirectTo: result.redirectTo });
  }
  @Post("sso/email-code/request")
  async requestEmailCode(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.mutation(req, true);
    const parsed = SsoEmailCodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid sign-in fields");
    }
    const { requestId, email, csrfToken } = parsed.data;
    if (!requestId || !email || !csrfToken) {
      throw new BadRequestException("Invalid sign-in fields");
    }
    const result = await this.emailCodes.request(
      { requestId, email, csrfToken },
      this.security.cookie(req, SSO_COOKIES.loginPreauth)
    );
    this.security.headers(res);
    res.json(result);
  }
  @Post("sso/email-code/verify")
  async verifyEmailCode(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.mutation(req, true);
    const parsed = SsoEmailCodeVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid sign-in fields");
    }
    const { requestId, email, csrfToken, code } = parsed.data;
    if (!requestId || !email || !csrfToken || !code) {
      throw new BadRequestException("Invalid sign-in fields");
    }
    const result = await this.sso.login(
      { requestId, email, csrfToken, emailCode: code },
      this.security.cookie(req, SSO_COOKIES.loginPreauth),
      this.security.cookie(req, SSO_COOKIES.central)
    );
    this.security.headers(res);
    this.security.setCookie(res, SSO_COOKIES.central, result.centralHandle, SSO_ABSOLUTE_MS);
    res.json({ redirectTo: result.redirectTo });
  }
  @Post("sso/cancel")
  async cancel(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.mutation(req, true);
    const parsed = z
      .object({ requestId: SsoHandleSchema, csrfToken: SsoHandleSchema })
      .strict()
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid request");
    }
    const redirectTo = await this.sso.cancel(
      parsed.data.requestId,
      this.security.cookie(req, SSO_COOKIES.loginPreauth),
      parsed.data.csrfToken
    );
    this.security.headers(res);
    res.json({ redirectTo });
  }
  @Get("auth/callback")
  async callback(@Query() query: unknown, @Req() req: Request, @Res() res: Response) {
    const origin = this.security.origin(req);
    const parsed = callbackSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid callback");
    }
    const result = await this.sso.callback(
      origin,
      { requestId: parsed.data.request, code: parsed.data.code, state: parsed.data.state },
      this.security.cookie(req, SSO_COOKIES.preauth)
    );
    this.security.headers(res);
    this.security.setCookie(res, SSO_COOKIES.app, result.handle, SSO_ABSOLUTE_MS);
    // Keep the pre-auth cookie until expiry so other outstanding tab transactions work.
    res.redirect(303, new URL(result.returnPath, origin).toString());
  }
  @Get("auth/logged-out")
  loggedOut(@Req() req: Request, @Res() res: Response) {
    this.security.origin(req);
    this.security.headers(res);
    res
      .type("html")
      .send(
        "<!doctype html><html lang=en><meta name=viewport content='width=device-width, initial-scale=1'><title>Corely</title><body><h1>Sign-in cancelled</h1><p>Return to your app when you are ready to sign in.</p></body></html>"
      );
  }
}
