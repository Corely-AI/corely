import { z } from "zod";
import { CreateEmployeeTaskSchema } from "../tasks/task.schema";

export const CliTaskAssigneesOperation = {
  id: "tasks.assignees",
  description: "List active staff who can receive a task in the workspace.",
  inputSchema: { type: "object", additionalProperties: false, properties: {} },
} as const;
export const CliTaskCreateOperation = {
  id: "tasks.create",
  description: "Create one internal follow-up for an active staff member.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["ownerStaffId", "title", "dueAt", "idempotencyKey"],
    properties: {
      ownerStaffId: { type: "string", format: "uuid" },
      title: { type: "string" },
      dueAt: { type: "string", format: "date-time" },
      idempotencyKey: { type: "string" },
    },
  },
} as const;
export const CliTaskCreateInputSchema = CreateEmployeeTaskSchema.extend({
  dueAt: CreateEmployeeTaskSchema.shape.dueAt.refine(
    (value) => value !== null,
    "Due time is required"
  ),
  idempotencyKey: z
    .string()
    .max(160)
    .regex(/^[\w-]+$/),
}).strict();
export const CliTaskCreatedSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["OPEN", "COMPLETED"]),
    ownerStaffId: z.string().uuid(),
    dueAt: z.string().datetime().nullable(),
    sourcePath: z.string().startsWith("/openbuk/app/tasks?taskId="),
  })
  .strict();
export { TaskAssigneeSchema } from "../tasks/task.schema";
