import type { ClassAttendanceStatus } from "../entities/classes.entities";

const DEFAULT_BILLABLE_BY_STATUS: Record<ClassAttendanceStatus, boolean> = {
  PRESENT: true,
  MAKEUP: true,
  ABSENT: false,
  EXCUSED: false,
};

export const resolveBillableForStatus = (
  status: ClassAttendanceStatus,
  override?: boolean | null
): boolean => {
  if (typeof override === "boolean") {
    return override;
  }
  return DEFAULT_BILLABLE_BY_STATUS[status];
};
