import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { EnvService } from "@corely/config";

type GuardRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class BackgroundInternalGuard implements CanActivate {
  constructor(private readonly env: EnvService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const expectedServiceToken = this.env.WORKER_API_SERVICE_TOKEN;
    const providedServiceToken = this.headerValue(request.headers ?? {}, "x-service-token");
    if (expectedServiceToken) {
      if (providedServiceToken !== expectedServiceToken) {
        throw new UnauthorizedException("Invalid service token");
      }
      return true;
    }

    const expectedLegacyKey = process.env.INTERNAL_WORKER_KEY;
    if (!expectedLegacyKey) {
      return true;
    }

    const providedLegacyKey = this.headerValue(request.headers ?? {}, "x-worker-key");
    if (providedLegacyKey !== expectedLegacyKey) {
      throw new UnauthorizedException("Invalid worker key");
    }

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
