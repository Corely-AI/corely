import { Injectable, CanActivate, ExecutionContext, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EnvService } from "@corely/config";

/**
 * Guard to protect routes that are only available in specific editions
 * Usage: @UseGuards(EditionGuard) @RequireEdition("ee")
 */
export const REQUIRE_EDITION_KEY = "requireEdition";

/**
 * Decorator to mark a controller/route as requiring a specific edition
 * @param edition "oss" | "ee"
 */
export const RequireEdition = (edition: "oss" | "ee") =>
  Reflect.metadata(REQUIRE_EDITION_KEY, edition);

@Injectable()
export class EditionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly env: EnvService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredEdition = this.reflector.getAllAndOverride<"oss" | "ee" | undefined>(
      REQUIRE_EDITION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredEdition) {
      // No edition requirement, allow access
      return true;
    }

    const currentEdition = this.env.EDITION;

    if (currentEdition !== requiredEdition) {
      throw new NotFoundException(
        `This endpoint is only available in ${requiredEdition.toUpperCase()} edition`
      );
    }

    return true;
  }
}
