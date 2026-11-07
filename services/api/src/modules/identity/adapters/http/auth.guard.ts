import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { AuthorizeRequestContextUseCase } from "../../application/use-cases/authorize-request-context.usecase";
import {
  resolveRequestContext,
  type ContextAwareRequest,
} from "../../../../shared/request-context";
import type { TokenServicePort } from "../../application/ports/token-service.port";
import { TOKEN_SERVICE_TOKEN } from "../../application/ports/token-service.port";

/**
 * Auth Guard
 * Validates JWT access token and sets user on request
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort,
    private readonly authorizeRequestContext: AuthorizeRequestContextUseCase
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ContextAwareRequest>();
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
          };
          request.tenantId = tenantId;
          request.roleIds = [];
          await this.validateContext(request);
          return true;
        }
      }
      throw new UnauthorizedException("Missing authorization header");
    }

    if (typeof authHeader !== "string") {
      throw new UnauthorizedException("Invalid authorization header format");
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
      roleIds,
    };

    request.tenantId = decoded.tenantId;
    request.roleIds = roleIds;

    await this.validateContext(request);
    return true;
  }

  private async validateContext(request: ContextAwareRequest): Promise<void> {
    const principal = request.user;
    if (!principal) {
      throw new UnauthorizedException("Authenticated principal required");
    }
    const ctx = resolveRequestContext(request);
    const { roleIds } = await this.authorizeRequestContext.execute({
      ...ctx,
      workspaceId: ctx.workspaceId ?? undefined,
    });
    principal.roleIds = roleIds;
    resolveRequestContext(request);
  }
}
