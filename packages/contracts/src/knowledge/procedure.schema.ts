import { z } from "zod";

export const ProcedureFileMaxBytes = 2 * 1024 * 1024;
const filename = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .refine((value) => !/[\\/\p{Cc}\p{Cs}]/u.test(value));
const page = z
  .object({ kind: z.literal("page"), text: z.string().trim().min(1).max(20000) })
  .strict();
const externalLink = z
  .object({
    kind: z.literal("link"),
    url: z
      .string()
      .max(2000)
      .url()
      .refine((value) => {
        try {
          const url = new URL(value);
          return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
        } catch {
          return false;
        }
      }),
  })
  .strict();
const metadata = z.object({
  title: z.string().trim().min(1).max(160),
  reviewDate: z.string().date(),
});
const upload = z
  .object({
    filename,
    base64: z
      .string()
      .min(4)
      .max(4 * Math.ceil(ProcedureFileMaxBytes / 3))
      .regex(/^[a-zA-Z0-9+/]+={0,2}$/),
  })
  .strict();
const newFile = z.object({ kind: z.literal("file"), upload }).strict();
const existingFile = z
  .object({ kind: z.literal("file"), filename, fileId: z.string().uuid() })
  .strict();
export const CreateProcedureSchema = metadata
  .extend({
    content: z.discriminatedUnion("kind", [page, externalLink, newFile]),
  })
  .strict();
export const ProcedureTransitionSchema = z
  .object({ revision: z.number().int().positive() })
  .strict();
export const UpdateProcedureSchema = metadata
  .extend({
    revision: ProcedureTransitionSchema.shape.revision,
    content: z.discriminatedUnion("kind", [
      page,
      externalLink,
      z.object({ kind: z.literal("file"), upload: upload.optional() }).strict(),
    ]),
  })
  .strict();
export const ProcedureContentSchema = z.discriminatedUnion("kind", [
  page,
  externalLink,
  existingFile,
]);
export const ProcedureFieldsSchema = metadata.extend({ content: ProcedureContentSchema }).strict();
export const PublishedProcedureSchema = ProcedureFieldsSchema.extend({
  version: z.number().int().positive(),
  publishedAt: z.string().datetime(),
}).strict();
const identity = z.object({ id: z.string().uuid(), ownerName: z.string().nullable() });
export const ProcedureDetailSchema = identity
  .extend({
    revision: ProcedureTransitionSchema.shape.revision,
    ownerUserId: z.string().min(1),
    draft: ProcedureFieldsSchema.nullable(),
    published: PublishedProcedureSchema.nullable(),
    archivedAt: z.string().datetime().nullable(),
    canManage: z.boolean(),
  })
  .strict();
export const ProcedureListSchema = z
  .object({
    canManage: z.boolean(),
    items: z.array(
      identity
        .extend({
          title: metadata.shape.title,
          reviewDate: metadata.shape.reviewDate,
          publishedVersion: z.number().int().positive().nullable(),
          status: z.enum(["draft", "published", "archived"]),
          hasDraft: z.boolean(),
        })
        .strict()
    ),
  })
  .strict();
export const ProcedurePublicationEventTypeSchema = z.enum([
  "knowledge.procedure.publish",
  "knowledge.procedure.archive",
]);
export const ProcedurePublicationEventPayloadSchema = z
  .object({
    workspaceId: z.string().min(1),
    procedureId: z.string().uuid(),
    version: z.number().int().positive().nullable(),
  })
  .strict();

export type CreateProcedure = z.infer<typeof CreateProcedureSchema>;
export type UpdateProcedure = z.infer<typeof UpdateProcedureSchema>;
export type ProcedureFields = z.infer<typeof ProcedureFieldsSchema>;
export type PublishedProcedure = z.infer<typeof PublishedProcedureSchema>;
export type ProcedureDetail = z.infer<typeof ProcedureDetailSchema>;
export type ProcedureList = z.infer<typeof ProcedureListSchema>;
