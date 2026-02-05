import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { EnvService } from "@corely/config";

type GuardRequest = {
  headers?: Record<string, string | string[] | undefined>;
  user?: {
    userId: string;
    tenantId: string | null;
    workspaceId?: string | null;
    roleIds: string[];
    email?: string;
  };
  tenantId?: string | null;
  workspaceId?: string | null;
  roleIds?: string[];
};

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private static readonly SYSTEM_USER_ID = "system-worker";

  constructor(private readonly env: EnvService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const expected = this.env.WORKER_API_SERVICE_TOKEN;
    if (expected) {
      const provided = this.headerValue(request.headers ?? {}, "x-service-token");
      if (provided !== expected) {
        throw new UnauthorizedException("Invalid service token");
      }
    }

    const tenantId = this.headerValue(request.headers ?? {}, "x-tenant-id");
    if (!tenantId) {
      throw new UnauthorizedException("Missing tenant context");
    }
    const workspaceId = this.headerValue(request.headers ?? {}, "x-workspace-id") ?? tenantId;

    request.user = {
      userId: ServiceTokenGuard.SYSTEM_USER_ID,
      tenantId,
      workspaceId,
      roleIds: [],
    };
    request.tenantId = tenantId;
    request.workspaceId = workspaceId;
    request.roleIds = [];

    return true;
  }

  private headerValue(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
