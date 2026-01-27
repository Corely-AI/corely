import {
  Injectable,
  type NestInterceptor,
  type CallHandler,
  type ExecutionContext,
  Inject,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import type { TenantResolver } from "./tenancy.types";
import { TENANT_RESOLVER_TOKEN } from "./tenancy.constants";

/**
 * Resolves tenant once per request and attaches it to the request object.
 * Must run before RequestContextInterceptor to avoid scattered header parsing.
 */
@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor(@Inject(TENANT_RESOLVER_TOKEN) private readonly resolver: TenantResolver) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    if (req) {
      const resolved = await this.resolver.resolve(req);
      req.tenantId = resolved.tenantId;
      req.workspaceId = req.workspaceId ?? resolved.tenantId;
      if (req.context) {
        req.context.tenantId = req.context.tenantId ?? resolved.tenantId;
        req.context.workspaceId = req.context.workspaceId ?? resolved.tenantId;
      }
    }

    return next.handle();
  }
}
