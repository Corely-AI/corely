import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isSurfaceAllowed, type SurfaceId } from "@corely/contracts";
import { resolveRequestContext } from "../request-context";

export const ALLOWED_SURFACES_KEY = "allowed_surfaces";

export const AllowSurfaces = (...surfaces: SurfaceId[]) =>
  SetMetadata(ALLOWED_SURFACES_KEY, surfaces);

@Injectable()
export class SurfaceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedSurfaces = this.reflector.getAllAndOverride<SurfaceId[] | undefined>(
      ALLOWED_SURFACES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!allowedSurfaces || allowedSurfaces.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const surfaceId = request.context?.surfaceId ?? resolveRequestContext(request).surfaceId;

    if (!isSurfaceAllowed(surfaceId, allowedSurfaces)) {
      throw new ForbiddenException(`Surface "${surfaceId}" is not allowed to access this resource`);
    }

    return true;
  }
}
