import { ValidationFailedError } from "@corely/domain";
import type { EnrollmentStatus } from "../entities/classes.entities";

const ALLOWED_ENROLLMENT_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  APPLIED: ["ENROLLED"],
  ENROLLED: ["DEFERRED", "DROPPED", "COMPLETED"],
  DEFERRED: ["ENROLLED"],
  DROPPED: [],
  COMPLETED: [],
};

export const canTransitionEnrollmentStatus = (
  from: EnrollmentStatus,
  to: EnrollmentStatus
): boolean => {
  if (from === to) {
    return true;
  }
  return ALLOWED_ENROLLMENT_TRANSITIONS[from].includes(to);
};

export const assertValidEnrollmentStatusTransition = (
  from: EnrollmentStatus,
  to: EnrollmentStatus
) => {
  if (!canTransitionEnrollmentStatus(from, to)) {
    throw new ValidationFailedError("Invalid enrollment status transition", [
      {
        message: `Cannot transition enrollment status from ${from} to ${to}`,
        members: ["status"],
      },
    ]);
  }
};
