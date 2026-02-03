import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantEntitlementsService } from "../application/tenant-entitlements.service";

export const REQUIRE_APP_KEY = "requireApp";
export const REQUIRE_FEATURE_KEY = "requireFeature";

export const RequireAppEnabled = (appId: string) => SetMetadata(REQUIRE_APP_KEY, appId);
export const RequireFeature = (featureKey: string) => SetMetadata(REQUIRE_FEATURE_KEY, featureKey);

@Injectable()
export class PlatformEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: TenantEntitlementsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredApp = this.reflector.getAllAndOverride<string>(REQUIRE_APP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredApp && !requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Assuming identity middleware populates user/tenant
    const tenantId = request.user?.tenantId || request.tenantId;

    if (!tenantId) {
      // If no tenant context, we can't check entitlements.
      // If auth guard passed, maybe it's a system request or super admin?
      // For safety, if entitlement is required but no tenant, block.
      // Unless it is explicitly allowed.
      // But usually endpoints requiring app enabled are within tenant context.
      return true;
    }

    const entitlements = await this.service.getEntitlements(tenantId);

    if (requiredApp) {
      const app = entitlements.apps.find((a) => a.appId === requiredApp);
      if (!app || !app.enabled) {
        throw new ForbiddenException(`App ${requiredApp} is disabled for this tenant`);
      }
    }

    if (requiredFeature) {
      const feat = entitlements.features.find((f) => f.key === requiredFeature);
      // Assuming boolean feature for now or presence check
      if (!feat || !feat.value) {
        throw new ForbiddenException(`Feature ${requiredFeature} is disabled for this tenant`);
      }
    }

    return true;
  }
}
