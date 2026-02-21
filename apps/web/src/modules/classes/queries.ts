import { createCrudQueryKeys } from "@/shared/crud";
import type {
  ListClassGroupsInput,
  ListClassSessionsInput,
  ListEnrollmentsInput,
  ListProgramsInput,
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

export const classesAcademyQueryKeys = {
  cohorts: {
    list: (params?: ListClassGroupsInput) => ["classes", "cohorts", "list", params] as const,
    detail: (id: string) => ["classes", "cohorts", id] as const,
    team: (id: string) => ["classes", "cohorts", id, "team"] as const,
    enrollments: (id: string, params?: ListEnrollmentsInput) =>
      ["classes", "cohorts", id, "enrollments", params] as const,
    milestones: (id: string) => ["classes", "cohorts", id, "milestones"] as const,
    outcomesSummary: (id: string) => ["classes", "cohorts", id, "outcomesSummary"] as const,
    resources: (id: string) => ["classes", "cohorts", id, "resources"] as const,
  },
  programs: {
    list: (params?: ListProgramsInput) => ["classes", "programs", "list", params] as const,
    detail: (id: string) => ["classes", "programs", id] as const,
  },
  enrollments: {
    billingPlan: (enrollmentId: string) =>
      ["classes", "enrollments", enrollmentId, "billingPlan"] as const,
  },
};
