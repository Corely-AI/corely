import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseFilters,
} from "@nestjs/common";
import {
  CliSsoAccountSchema,
  CliSsoExchangeSchema,
  CliSsoStartSchema,
  SsoHandleSchema,
} from "@corely/contracts";
import type { Request, Response } from "express";
import { z } from "zod";
import { ListWorkspacesUseCase } from "../../../workspaces/public";
import { SsoService } from "../../application/services/sso.service";
import { SsoSessionService } from "../../application/services/sso-session.service";
import { SsoExceptionFilter } from "./sso-exception.filter";
import { SSO_COOKIES, SsoHttpSecurity } from "./sso-http-security";

const consentSchema = z.object({ request: SsoHandleSchema, csrfToken: SsoHandleSchema }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException("Invalid CLI sign-in request");
  }
  return result.data;
}

function bearer(req: Request): string {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(req.headers.authorization ?? "");
  if (!match) {
    throw new UnauthorizedException("CLI credential required");
  }
  return match[1];
}

@Controller("sso/cli")
@UseFilters(SsoExceptionFilter)
export class CliSsoController {
  constructor(
    @Inject(SsoService) private readonly sso: SsoService,
    @Inject(SsoSessionService) private readonly sessions: SsoSessionService,
    @Inject(SsoHttpSecurity) private readonly security: SsoHttpSecurity,
    @Inject(ListWorkspacesUseCase) private readonly listWorkspaces: ListWorkspacesUseCase
  ) {}

  @Post("start")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  start(@Body() body: unknown, @Req() req: Request) {
    this.security.origin(req, true);
    return this.sso.startCli(parse(CliSsoStartSchema, body), req.socket.remoteAddress ?? "unknown");
  }

  @Get("consent")
  async showConsent(@Query("request") value: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.origin(req, true);
    const request = parse(SsoHandleSchema, value);
    const { csrfToken } = await this.sso.cliConsent(
      request,
      this.security.cookie(req, SSO_COOKIES.central)
    );
    this.security.headers(res);
    res.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'"
    );
    // Both interpolations use the URL-safe alphabet validated or produced by Identity.
    res.type("html").send(`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in to Corely CLI</title>
<style>
  body { margin: 0; background: #f6f7f9; color: #172133; font: 1rem/1.55 system-ui, sans-serif; }
  main { width: min(28rem, calc(100% - 3rem)); margin: 14vh auto 2rem; padding: 1.5rem;
    box-sizing: border-box; background: white; border: 1px solid #dce1e8; border-radius: .75rem; }
  h1 { margin: 0; font-size: 1.5rem; line-height: 1.25; }
  p { margin: .75rem 0 1.25rem; }
  button { padding: .65rem 1rem; border: 0; border-radius: .4rem; font: inherit;
    font-weight: 600; color: white; background: #214597; cursor: pointer; }
  button:focus-visible { outline: 3px solid #214597; outline-offset: 3px; }
</style>
<main>
  <h1>Sign in to Corely CLI</h1>
  <p>Continue only if you started sign-in from your terminal.</p>
  <form method="post" action="/sso/cli/consent">
    <input type="hidden" name="request" value="${request}">
    <input type="hidden" name="csrfToken" value="${csrfToken}">
    <button type="submit">Continue to Corely CLI</button>
  </form>
</main>
</html>`);
  }

  @Post("consent")
  async acceptConsent(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    this.security.mutation(req, true);
    const { request, csrfToken } = parse(consentSchema, body);
    const { redirectTo } = await this.sso.cliConsent(
      request,
      this.security.cookie(req, SSO_COOKIES.central),
      csrfToken
    );
    this.security.headers(res);
    res.redirect(303, redirectTo);
  }

  @Post("exchange")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  exchange(@Body() body: unknown, @Req() req: Request) {
    this.security.origin(req, true);
    return this.sso.exchangeCli(parse(CliSsoExchangeSchema, body));
  }

  @Get("account")
  @Header("Cache-Control", "no-store")
  async account(@Req() req: Request) {
    this.security.origin(req, true);
    const userId = await this.sessions.authenticateCli(bearer(req));
    const { email, name, memberships } = await this.sessions.profile(userId);
    const groups = await Promise.all(
      memberships.map(async ({ tenantId }) => {
        const { workspaces } = await this.listWorkspaces.execute({ tenantId, userId });
        return workspaces.map(({ id, name: workspaceName, slug }) => ({
          id,
          tenantId,
          name: workspaceName,
          slug: slug ?? null,
        }));
      })
    );
    return CliSsoAccountSchema.parse({ userId, email, name, workspaces: groups.flat() });
  }

  @Post("logout")
  @HttpCode(204)
  @Header("Cache-Control", "no-store")
  logout(@Req() req: Request) {
    this.security.origin(req, true);
    return this.sessions.logoutCli(bearer(req));
  }
}
