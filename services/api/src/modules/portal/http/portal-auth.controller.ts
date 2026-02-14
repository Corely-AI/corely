import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { PortalRequestCodeUseCase } from "../application/use-cases/portal-request-code.usecase";
import { PortalVerifyCodeUseCase } from "../application/use-cases/portal-verify-code.usecase";
import { PortalRefreshUseCase } from "../application/use-cases/portal-refresh.usecase";
import { PortalLogoutUseCase } from "../application/use-cases/portal-logout.usecase";
import { PublicWorkspaceResolver } from "../../../shared/public";
import { PORTAL_REFRESH_TTL_DAYS } from "../application/portal-otp.utils";

const REFRESH_COOKIE_NAME = "portal_refresh_token";

@Controller("portal/auth")
export class PortalAuthController {
  private readonly logger = new Logger(PortalAuthController.name);

  constructor(
    private readonly requestCode: PortalRequestCodeUseCase,
    private readonly verifyCode: PortalVerifyCodeUseCase,
    private readonly refresh: PortalRefreshUseCase,
    private readonly logout: PortalLogoutUseCase,
    private readonly publicWorkspaceResolver: PublicWorkspaceResolver
  ) {}

  @Post("request-code")
  @HttpCode(HttpStatus.OK)
  async handleRequestCode(@Body() body: { email?: string }, @Req() req: Request) {
    if (!body.email || !body.email.includes("@")) {
      throw new BadRequestException("Valid email is required");
    }

    const { tenantId, workspaceId } = await this.resolveWorkspace(req);

    const result = await this.requestCode.execute({
      email: body.email,
      tenantId,
      workspaceId,
    });

    return result;
  }

  @Post("verify-code")
  @HttpCode(HttpStatus.OK)
  async handleVerifyCode(
    @Body() body: { email?: string; code?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!body.email || !body.code) {
      throw new BadRequestException("Email and code are required");
    }

    if (!/^\d{6}$/.test(body.code)) {
      throw new BadRequestException("Code must be 6 digits");
    }

    const { tenantId, workspaceId } = await this.resolveWorkspace(req);

    try {
      const result = await this.verifyCode.execute({
        email: body.email,
        code: body.code,
        tenantId,
        workspaceId,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

      // Set refresh token as HttpOnly cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: PORTAL_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return {
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error: any) {
      if (error?.statusCode === 400 || error?.code === "INVALID_CODE") {
        throw new BadRequestException("Invalid or expired code");
      }
      throw error;
    }
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async handleRefresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string }
  ) {
    // Prefer cookie, fallback to body
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? body.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException("Refresh token is required");
    }

    try {
      const result = await this.refresh.execute({ refreshToken });

      // Rotate cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: PORTAL_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return { accessToken: result.accessToken };
    } catch (error: any) {
      if (error?.statusCode === 401) {
        // Clear stale cookie
        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new BadRequestException("Session expired, please log in again");
      }
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async handleLogout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string }
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? body.refreshToken;

    if (refreshToken) {
      await this.logout.execute({ refreshToken });
    }

    // Clear cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });

    return { message: "Logged out" };
  }

  private async resolveWorkspace(req: Request): Promise<{ tenantId: string; workspaceId: string }> {
    // Try to resolve from public workspace context (subdomain/path/header)
    try {
      const publicCtx = await this.publicWorkspaceResolver.resolve(req as any);
      return {
        tenantId: publicCtx.tenantId,
        workspaceId: publicCtx.workspaceId,
      };
    } catch {
      // Fallback to headers
      const tenantId = req.headers["x-tenant-id"] as string | undefined;
      const workspaceId = req.headers["x-workspace-id"] as string | undefined;

      if (!tenantId || !workspaceId) {
        throw new BadRequestException(
          "Workspace could not be resolved. Provide workspace context via URL or headers."
        );
      }

      return { tenantId, workspaceId };
    }
  }
}
