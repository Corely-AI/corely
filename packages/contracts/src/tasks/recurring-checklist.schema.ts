import { z } from "zod";
const date = z
  .string()
  .date()
  .refine((v) => v >= "2000-01-01" && v <= "9998-12-31", "Use a date from 2000 to 9998");
const timezone = z
  .string()
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone");
export const ChecklistStepSchema = z
  .object({ id: z.string().uuid(), title: z.string().trim().min(1).max(240) })
  .strict();
export const ChecklistPlanSchema = z
  .object({
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(160),
    effectiveFrom: date,
    effectiveUntil: date.nullable(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    assigneeIds: z.array(z.string().uuid()).min(1).max(20),
    steps: z.array(ChecklistStepSchema).min(1).max(10),
  })
  .strict();
const planInput = ChecklistPlanSchema.omit({ version: true });
export const PublishChecklistSchema = planInput
  .extend({ timezone })
  .strict()
  .superRefine((v, ctx) => {
    const bad = (message: string) => ctx.addIssue({ code: "custom", message });
    if (v.effectiveUntil && v.effectiveUntil < v.effectiveFrom) {
      bad("End date must not precede start date (inclusive)");
    }
    if (
      new Set(v.weekdays).size !== v.weekdays.length ||
      new Set(v.assigneeIds).size !== v.assigneeIds.length ||
      new Set(v.steps.map((s) => s.id)).size !== v.steps.length
    ) {
      bad("Weekdays, assignees and step IDs must be unique");
    }
  });
export const EditChecklistSchema = z
  .object({ version: z.number().int().positive(), plan: PublishChecklistSchema })
  .strict();
export const ChecklistVersionSchema = z.object({ version: z.number().int().positive() }).strict();
export const SkipChecklistDateSchema = ChecklistVersionSchema.extend({ localDate: date }).strict();
export const ChecklistOccurrenceSchema = z
  .object({
    id: z.string().uuid(),
    templateId: z.string().uuid(),
    localDate: date,
    templateVersion: z.number().int().positive(),
    state: z.enum(["GENERATED", "SKIPPED"]),
    reason: z
      .enum(["PAUSED", "MANUAL", "CLOCK_GAP", "NO_ELIGIBLE_ASSIGNEES", "PUBLISHER_ACCESS"])
      .nullable(),
    taskIds: z.array(z.string().uuid()),
    skippedAssignees: z.array(
      z
        .object({ staffId: z.string().uuid(), reason: z.enum(["INACTIVE", "NOT_AVAILABLE"]) })
        .strict()
    ),
    createdAt: z.string().datetime(),
  })
  .strict();
export const ChecklistTemplateSchema = z
  .object({
    id: z.string().uuid(),
    workspaceId: z.string(),
    timezone,
    version: z.number().int().positive(),
    state: z.enum(["ACTIVE", "PAUSED", "ENDED"]),
    plans: z.array(ChecklistPlanSchema).min(1).max(50),
    pauses: z.array(z.object({ fromDate: date, throughDate: date.nullable() }).strict()).max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const ChecklistTemplateViewSchema = ChecklistTemplateSchema.extend({
  localToday: date,
  occurrences: z.array(ChecklistOccurrenceSchema),
}).strict();
export const ListChecklistTemplatesSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export const ChecklistTemplateListSchema = z
  .object({
    items: z.array(ChecklistTemplateViewSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .strict();
export type ChecklistPlan = z.infer<typeof ChecklistPlanSchema>;
export type ChecklistTemplate = z.infer<typeof ChecklistTemplateSchema>;
export type ChecklistTemplateView = z.infer<typeof ChecklistTemplateViewSchema>;
export type ChecklistOccurrence = z.infer<typeof ChecklistOccurrenceSchema>;
export type ChecklistTemplateList = z.infer<typeof ChecklistTemplateListSchema>;
export type PublishChecklist = z.infer<typeof PublishChecklistSchema>;

export const ChecklistEventTypeSchema = z.enum([
  "tasks.checklist.publish",
  "tasks.checklist.edit",
  "tasks.checklist.pause",
  "tasks.checklist.resume",
  "tasks.checklist.end",
  "tasks.checklist.skip",
  "tasks.checklist.materialize",
]);
export const ChecklistEventPayloadSchema = z
  .object({
    workspaceId: z.string().min(1),
    templateId: z.string().uuid(),
    version: z.number().int().positive(),
    localDate: date.optional(),
    occurrenceId: z.string().uuid().optional(),
  })
  .strict();
