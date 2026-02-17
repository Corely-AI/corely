import { createCrudQueryKeys } from "@/shared/crud";
import type {
  ListClassGroupsInput,
  ListClassSessionsInput,
  ListEnrollmentsInput,
} from "@corely/contracts";

export const classGroupKeys = createCrudQueryKeys("class-groups");
export const classSessionKeys = createCrudQueryKeys("class-sessions");
export const classEnrollmentKeys = createCrudQueryKeys("class-enrollments");

export const classGroupListKey = (params?: ListClassGroupsInput) => classGroupKeys.list(params);
export const classSessionListKey = (params?: ListClassSessionsInput) =>
  classSessionKeys.list(params);
export const classEnrollmentListKey = (params?: ListEnrollmentsInput) =>
  classEnrollmentKeys.list(params);

export const classAttendanceKeys = {
  session: (sessionId: string) => ["class-attendance", sessionId],
};

export const classBillingKeys = {
  preview: (month: string, classGroupId?: string) =>
    classGroupId
      ? ["class-billing", "preview", month, classGroupId]
      : ["class-billing", "preview", month],
  previewMonth: (month: string) => ["class-billing", "preview", month],
  runs: () => ["class-billing", "runs"],
};
