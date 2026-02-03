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
      // Small bypass for integration tests that use headers instead of tokens
      if (process.env.NODE_ENV === "test") {
        const userId = request.headers["x-user-id"] as string;
        const tenantId = request.headers["x-tenant-id"] as string;
        if (userId) {
          request.user = {
            userId,
            tenantId,
            roleIds: [],
            workspaceId: tenantId, // Default in tests
          };
          request.tenantId = tenantId;
          request.roleIds = [];
          request.workspaceId = tenantId;
          return true;
        }
      }
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
    const workspaceId = request.context?.workspaceId ?? decoded.tenantId;

    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      workspaceId,
      roleIds,
    };

    request.tenantId = decoded.tenantId;
    request.roleIds = roleIds;
    request.workspaceId = workspaceId;

    return true;
  }
}
