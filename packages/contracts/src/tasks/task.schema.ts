import { z } from "zod";

export const TaskStatusSchema = z.enum(["OPEN", "COMPLETED"]);
const fields = {
  title: z.string().trim().min(1).max(240),
  ownerStaffId: z.string().uuid(),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .refine((value) => Number.isFinite(Date.parse(value)), "Invalid due time offset")
    .transform((value) => new Date(value).toISOString())
    .pipe(z.string().datetime())
    .nullable()
    .default(null),
};
export const CreateEmployeeTaskSchema = z.object(fields).strict();
export const UpdateEmployeeTaskSchema = z
  .object({ ...fields, version: z.number().int().positive() })
  .strict();
export const TransitionEmployeeTaskSchema = z
  .object({ version: z.number().int().positive() })
  .strict();
export const EmployeeTaskSchema = z
  .object({
    id: z.string().uuid(),
    workspaceId: z.string(),
    ...fields,
    ownerName: z.string(),
    ownerArchived: z.boolean(),
    status: TaskStatusSchema,
    version: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
  })
  .strict();
export const ListEmployeeTasksSchema = z
  .object({
    status: z.enum(["all", "OPEN", "COMPLETED"]).default("all"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export const TaskAssigneeSchema = z
  .object({ id: z.string().uuid(), displayName: z.string() })
  .strict();
export const EmployeeTaskListSchema = z
  .object({
    items: z.array(EmployeeTaskSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    capabilities: z.object({ manage: z.boolean(), completeOwn: z.boolean() }).strict(),
  })
  .strict();
export type EmployeeTask = z.infer<typeof EmployeeTaskSchema>;
export type CreateEmployeeTask = z.infer<typeof CreateEmployeeTaskSchema>;
export type UpdateEmployeeTask = z.infer<typeof UpdateEmployeeTaskSchema>;
export type EmployeeTaskList = z.infer<typeof EmployeeTaskListSchema>;
export type TaskAssignee = z.infer<typeof TaskAssigneeSchema>;

// Neutral lifecycle facts consumed by the API-hosted outbox; no personnel details.
export const EmployeeTaskEventTypeSchema = z.enum([
  "tasks.task.create",
  "tasks.task.update",
  "tasks.task.complete",
  "tasks.task.reopen",
]);
export const EmployeeTaskEventPayloadSchema = z
  .object({
    workspaceId: z.string().min(1),
    taskId: z.string().uuid(),
    version: z.number().int().positive(),
  })
  .strict();
