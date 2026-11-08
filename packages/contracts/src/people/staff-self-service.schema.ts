import { z } from "zod";
import { StaffDirectoryEntrySchema, StaffPrivateFieldsSchema } from "./staff.schema";
import { StaffAvailabilitySchema, StaffCommitmentSchema } from "./staff-availability.schema";
import { EmployeeTaskSchema } from "../tasks/task.schema";
import { ChecklistStepSchema } from "../tasks/recurring-checklist.schema";
const id = z.string().min(1).max(160);
export const StaffSelfUpdateSchema = StaffPrivateFieldsSchema.pick({
  personalEmail: true,
  personalPhone: true,
})
  .extend({
    profileId: id,
    displayName: z.string().trim().min(1).max(160),
    version: z.number().int().positive(),
    contactsVersion: z.number().int().nonnegative(),
  })
  .strict();
export const StaffSelfViewSchema = z
  .object({
    profile: StaffDirectoryEntrySchema,
    canEdit: z.boolean(),
    contacts: StaffPrivateFieldsSchema.pick({ personalEmail: true, personalPhone: true })
      .extend({ version: z.number().int().nonnegative() })
      .strict(),
    availability: StaffAvailabilitySchema,
    onboardingTask: EmployeeTaskSchema.nullable(),
    tasksAvailable: z.boolean(),
  })
  .strict();
export const ApproveStaffOnboardingSchema = z
  .object({
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(240),
    steps: z.array(ChecklistStepSchema).min(1).max(10),
    dueAt: z.string().datetime().nullable().default(null),
  })
  .strict()
  .refine(
    (input) => new Set(input.steps.map((s) => s.id)).size === input.steps.length,
    "Checklist step IDs must be unique"
  );
export const OffboardStaffSchema = z
  .object({ version: z.number().int().positive(), disableWorkspaceAccess: z.boolean() })
  .strict();
export const StaffWorkspaceAccessSchema = z
  .object({
    linked: z.boolean(),
    status: z.enum(["UNLINKED", "MISSING", "INVITED", "ACTIVE", "DISABLED"]),
    canDisable: z.boolean(),
  })
  .strict();
export const StaffTaskFollowupSchema = z
  .object({
    available: z.boolean(),
    openTaskCount: z.number().int().nonnegative(),
    openTasks: z.array(EmployeeTaskSchema),
    recurringTemplates: z.array(z.object({ id, title: z.string() }).strict()),
  })
  .strict();
export const StaffLifecycleViewSchema = z
  .object({
    profile: StaffDirectoryEntrySchema,
    onboardingTask: EmployeeTaskSchema.nullable(),
    tasks: StaffTaskFollowupSchema,
    bookings: z.array(StaffCommitmentSchema),
    access: StaffWorkspaceAccessSchema,
  })
  .strict();
export const StaffLifecycleRecordSchema = z
  .object({
    onboardingTaskId: id.nullable().default(null),
    approvedAt: z.string().datetime().nullable().default(null),
  })
  .strict();
export type StaffSelfView = z.infer<typeof StaffSelfViewSchema>;
export type StaffLifecycleView = z.infer<typeof StaffLifecycleViewSchema>;
export type StaffWorkspaceAccess = z.infer<typeof StaffWorkspaceAccessSchema>;
export type StaffTaskFollowup = z.infer<typeof StaffTaskFollowupSchema>;
export type ApproveStaffOnboarding = z.infer<typeof ApproveStaffOnboardingSchema>;
export type StaffLifecycleRecord = z.infer<typeof StaffLifecycleRecordSchema>;
export const StaffLifecycleEventTypeSchema = z.enum([
  "people.staff.create",
  "people.staff.update",
  "people.staff.archive",
  "people.staff.private",
  "people.staff.self_update",
  "people.staff.onboarding",
  "people.staff.offboard",
]);
export const StaffLifecycleEventPayloadSchema = z
  .object({ workspaceId: id, staffId: id, version: z.number().int().positive() })
  .strict();
