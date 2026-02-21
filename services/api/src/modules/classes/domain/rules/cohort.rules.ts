import { ValidationFailedError } from "@corely/domain";
import type { ClassGroupLifecycle } from "../entities/classes.entities";

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<ClassGroupLifecycle, ClassGroupLifecycle[]> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["RUNNING", "ARCHIVED"],
  RUNNING: ["ENDED"],
  ENDED: ["ARCHIVED"],
  ARCHIVED: [],
};

export const canTransitionLifecycle = (
  from: ClassGroupLifecycle,
  to: ClassGroupLifecycle
): boolean => {
  if (from === to) {
    return true;
  }
  return ALLOWED_LIFECYCLE_TRANSITIONS[from].includes(to);
};

export const assertValidLifecycleTransition = (
  from: ClassGroupLifecycle,
  to: ClassGroupLifecycle
) => {
  if (!canTransitionLifecycle(from, to)) {
    throw new ValidationFailedError("Invalid cohort lifecycle transition", [
      {
        message: `Cannot transition cohort lifecycle from ${from} to ${to}`,
        members: ["lifecycle"],
      },
    ]);
  }
};
