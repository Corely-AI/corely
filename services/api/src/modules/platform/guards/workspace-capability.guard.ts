import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { resolveRequestContext } from "../../../shared/request-context";
import { WorkspaceExperienceResolverService } from "../application/services/workspace-experience-resolver.service";

export const REQUIRE_WORKSPACE_CAPABILITY = "require_workspace_capability";

@Injectable()
export class WorkspaceCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly experienceResolver: WorkspaceExperienceResolverService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapability = this.reflector.getAllAndOverride<string>(
      REQUIRE_WORKSPACE_CAPABILITY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredCapability) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const requestContext = request.context ?? resolveRequestContext(request);
    const tenantId = requestContext.tenantId ?? request.tenantId;
    const workspaceId =
      requestContext.workspaceId ??
      request.params?.workspaceId ??
      request.body?.workspaceId ??
      null;

    if (!tenantId) {
      throw new ForbiddenException("Tenant context not found");
    }

    if (!workspaceId) {
      throw new ForbiddenException("Workspace context not found");
    }

    const experience = await this.experienceResolver.resolve({
      tenantId,
      userId: requestContext.userId ?? "system",
      workspaceId,
      surfaceId: requestContext.surfaceId,
    });
    const capabilities = experience.capabilities;

    if (!capabilities[requiredCapability as keyof typeof capabilities]) {
      throw new ForbiddenException(`Capability "${requiredCapability}" is not available`);
    }

    return true;
  }
}

export const RequireWorkspaceCapability = (capability: string) =>
  SetMetadata(REQUIRE_WORKSPACE_CAPABILITY, capability);
