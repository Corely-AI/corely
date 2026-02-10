import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

/**
 * Guard that blocks test harness endpoints in production
 * and requires X-Test-Secret header matching TEST_HARNESS_SECRET env var
 */
@Injectable()
export class TestHarnessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Block in production
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("Test harness endpoints are not available in production");
    }

    const request = context.switchToHttp().getRequest();
    const testSecret = request.headers["x-test-secret"];
    const expectedSecret = process.env.TEST_HARNESS_SECRET || "test-secret-key";

    // Require X-Test-Secret header
    if (!testSecret || testSecret !== expectedSecret) {
      throw new ForbiddenException("Invalid or missing X-Test-Secret header");
    }

    return true;
  }
}
