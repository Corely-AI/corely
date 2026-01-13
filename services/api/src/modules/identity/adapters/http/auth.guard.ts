import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import type { TokenServicePort } from "../../application/ports/token-service.port";
import { TOKEN_SERVICE_TOKEN } from "../../application/ports/token-service.port";

/**
 * Auth Guard
 * Validates JWT access token and sets user on request
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("Missing authorization header");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      throw new UnauthorizedException("Invalid authorization header format");
    }

    const token = parts[1];

    // Verify and decode token
    const decoded = await this.tokenService.verifyAccessToken(token);

    if (!decoded) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const roleIds = Array.isArray(decoded.roleIds) ? decoded.roleIds : [];

    // Set user, tenant, and roles on request (typed principal)
    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      workspaceId: decoded.tenantId, // token does not yet carry workspace; default to tenant
      roleIds,
    };

    request.tenantId = decoded.tenantId;
    request.roleIds = roleIds;
    request.workspaceId = request.user.workspaceId ?? null;

    return true;
  }
}
