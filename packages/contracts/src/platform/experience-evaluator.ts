import { isSurfaceAllowed, type SurfaceId, type SurfaceTargetId } from "./surface.schema";
import type { PosVerticalId } from "./experience-targeting.schema";

export interface ExperienceEvaluatorContext {
  surfaceId: SurfaceId;
  verticalId?: PosVerticalId | null;
  capabilities?: Iterable<string>;
  permissions?: Iterable<string>;
}

export interface ExperienceEvaluatorTarget {
  allowedSurfaces?: readonly SurfaceTargetId[] | null;
  allowedVerticals?: readonly PosVerticalId[] | null;
  requiredCapabilities?: readonly string[] | null;
  requiredPermissions?: readonly string[] | null;
}

const toSet = (values?: Iterable<string>): Set<string> => new Set(values ?? []);

const includesAll = (
  required: readonly string[] | null | undefined,
  actual: Set<string>
): boolean => {
  if (!required || required.length === 0) {
    return true;
  }

  return required.every((value) => actual.has(value));
};

export const isExperienceTargetVisible = (
  target: ExperienceEvaluatorTarget,
  context: ExperienceEvaluatorContext
): boolean => {
  if (!isSurfaceAllowed(context.surfaceId, target.allowedSurfaces)) {
    return false;
  }

  if (target.allowedVerticals && target.allowedVerticals.length > 0) {
    if (context.surfaceId !== "pos") {
      return false;
    }

    if (!context.verticalId || !target.allowedVerticals.includes(context.verticalId)) {
      return false;
    }
  }

  if (!includesAll(target.requiredCapabilities, toSet(context.capabilities))) {
    return false;
  }

  if (!includesAll(target.requiredPermissions, toSet(context.permissions))) {
    return false;
  }

  return true;
};
