import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseFilters,
} from "@nestjs/common";
import {
  CliAgentIdSchema,
  CliGrantInputSchema,
  CliGrantScopeSchema,
  CliOperationIdSchema,
  SsoHandleSchema,
} from "@corely/contracts";
import type { Request } from "express";
import { z } from "zod";
import { CliAgentGrantsService } from "../../application/services/cli-agent-grants.service";
import { SsoSessionService } from "../../application/services/sso-session.service";
import { SsoHttpSecurity } from "./sso-http-security";
import { SsoExceptionFilter } from "./sso-exception.filter";

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException("Invalid CLI agent request");
  }
  return result.data;
}

function authorization(req: Request): string {
  return /^Bearer (\S+)$/i.exec(req.headers.authorization ?? "")?.[1] ?? "";
}

function agentCredential(req: Request) {
  const match = /^corely-agent\.([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/.exec(authorization(req));
  if (!match || !CliAgentIdSchema.safeParse(match[1]).success) {
    throw new UnauthorizedException("Agent credential required");
  }
  return { agentId: match[1], secret: match[2] };
}

@Controller("sso/cli")
@UseFilters(SsoExceptionFilter)
export class CliAgentController {
  constructor(
    @Inject(CliAgentGrantsService) private readonly grants: CliAgentGrantsService,
    @Inject(SsoSessionService) private readonly sessions: SsoSessionService,
    @Inject(SsoHttpSecurity) private readonly security: SsoHttpSecurity
  ) {}

  @Post("grants")
  async issue(@Req() req: Request, @Body() body: unknown) {
    return this.grants.create(await this.manager(req), parse(CliGrantInputSchema, body));
  }

  @Get("grants")
  async list(@Req() req: Request, @Query() query: unknown) {
    return this.grants.list(await this.manager(req), parse(CliGrantScopeSchema, query));
  }

  @Post("grants/:agentId/revoke")
  @HttpCode(200)
  async revoke(@Req() req: Request, @Param("agentId") id: string, @Body() body: unknown) {
    return this.grants.revoke(
      await this.manager(req),
      parse(CliGrantScopeSchema, body),
      parse(CliAgentIdSchema, id)
    );
  }

  @Get("capabilities")
  capabilities(@Req() req: Request, @Query() query: unknown) {
    this.security.origin(req, true);
    return this.grants.capabilities(parse(CliGrantScopeSchema, query), agentCredential(req));
  }

  @Post("operations/:operation")
  @HttpCode(200)
  execute(@Req() req: Request, @Param("operation") op: string, @Body() body: unknown) {
    this.security.origin(req, true);
    const request = parse(CliGrantScopeSchema.extend({ input: z.record(z.unknown()) }), body);
    return this.grants.execute(
      request,
      agentCredential(req),
      parse(CliOperationIdSchema, op),
      request.input
    );
  }

  private manager(req: Request) {
    this.security.origin(req, true);
    const token = SsoHandleSchema.safeParse(authorization(req));
    if (!token.success) {
      throw new UnauthorizedException("Manager CLI credential required");
    }
    return this.sessions.authenticateCli(token.data);
  }
}
