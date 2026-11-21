import {
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { ContextAwareRequest } from "../../../../shared/request-context";
import { TenantAdminSessions } from "../../application/services/tenant-admin-sessions";
import { AuthGuard } from "./auth.guard";

@Controller()
export class TenantAdminSessionController {
  constructor(private readonly sessions: TenantAdminSessions) {}

  @Post("platform/tenants/:tenantId/admin-session")
  @Header("Cache-Control", "no-store")
  @UseGuards(AuthGuard)
  start(@Param("tenantId") tenantId: string, @Req() request: ContextAwareRequest) {
    if (
      !request.user?.userId ||
      request.user.tenantId !== null ||
      request.context?.tenantId !== null
    ) {
      throw new ForbiddenException("Platform session required");
    }
    return this.sessions.start(request.user.userId, tenantId);
  }

  @Post("auth/tenant-admin-session/end")
  @HttpCode(204)
  async end(@Req() request: ContextAwareRequest) {
    const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "");
    if (!match) {
      throw new UnauthorizedException("Tenant admin session required");
    }
    await this.sessions.end(match[1]);
  }
}
