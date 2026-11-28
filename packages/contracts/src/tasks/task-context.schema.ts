import { z } from "zod";
import { CreateEmployeeTaskSchema } from "./task.schema";

export const TaskSourceKindSchema = z.enum(["booking", "request", "procedure"]);
export const TaskSourceSchema = z
  .object({
    kind: TaskSourceKindSchema,
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
  })
  .strict();

export const TaskCommentInputSchema = z
  .object({ text: z.string().trim().min(1).max(2000) })
  .strict();
export const CreateTaskFollowUpSchema = z
  .object({ task: CreateEmployeeTaskSchema, source: TaskSourceSchema })
  .strict();

export const TaskCommentSchema = TaskCommentInputSchema.extend({
  id: z.string().uuid(),
  authorUserId: z.string(),
  createdAt: z.string().datetime(),
});

export const MAX_TASK_ATTACHMENT_BYTES = 1024 * 1024;

export const TaskAttachmentUploadSchema = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .regex(/^[^\p{Cc}/\\]+$/u),
    contentType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
    base64: z
      .string()
      .min(4)
      .max(4 * Math.ceil(MAX_TASK_ATTACHMENT_BYTES / 3))
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();

export const TaskAttachmentSchema = z
  .object({
    documentId: z.string(),
    filename: z.string(),
    contentType: TaskAttachmentUploadSchema.shape.contentType,
    sizeBytes: z.number().int().positive(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const TaskContextSchema = z
  .object({
    comments: z.array(TaskCommentSchema),
    files: z.array(TaskAttachmentSchema),
    sources: z.array(
      z.discriminatedUnion("status", [
        z.object({
          kind: TaskSourceKindSchema,
          status: z.literal("unavailable"),
        }),
        TaskSourceSchema.extend({ status: z.literal("available") }),
      ])
    ),
  })
  .strict();

export type TaskSource = z.infer<typeof TaskSourceSchema>;
export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;
export type TaskContext = z.infer<typeof TaskContextSchema>;
