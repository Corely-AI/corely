import { z } from "zod";

export const OperationalTaskTools = {
  list: "operations_listTasks",
  propose: "operations_proposeTaskCompletion",
  apply: "operations_applyTaskCompletion",
} as const;

export const OperationalTaskListInputSchema = z
  .object({
    status: z.enum(["OPEN", "COMPLETED"]).default("OPEN"),
  })
  .strict();

export const OperationalTaskSelectionSchema = z
  .object({
    taskId: z.string().uuid(),
  })
  .strict();

export const OperationalTaskSnapshotSchema = OperationalTaskSelectionSchema.extend({
  title: z.string().min(1).max(240),
  version: z.number().int().positive(),
  status: z.enum(["OPEN", "COMPLETED"]),
  dueAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
}).strict();

export const OperationalTaskCompletionSchema = OperationalTaskSelectionSchema.extend({
  action: z.literal("complete"),
  title: OperationalTaskSnapshotSchema.shape.title,
  version: OperationalTaskSnapshotSchema.shape.version,
  expiresAt: z.string().datetime(),
  proof: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

const OperationalTaskSourceSchema = z
  .object({
    type: z.literal("task"),
    recordId: OperationalTaskSelectionSchema.shape.taskId,
    version: OperationalTaskSnapshotSchema.shape.version,
    path: z.literal("/tasks"),
  })
  .strict();

export const OperationalTaskListResultSchema = z
  .object({
    tasks: z
      .array(OperationalTaskSnapshotSchema.extend({ source: OperationalTaskSourceSchema }))
      .max(10),
    retrievedAt: z.string().datetime(),
    limited: z.boolean(),
  })
  .strict();

export const OperationalTaskApplyResultSchema = z
  .object({
    task: OperationalTaskSnapshotSchema,
    source: OperationalTaskSourceSchema,
  })
  .strict();

export type OperationalTaskCompletion = z.infer<typeof OperationalTaskCompletionSchema>;
