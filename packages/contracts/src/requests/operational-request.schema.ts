import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const OperationalRequestKindSchema = z.enum(["ABSENCE", "EQUIPMENT", "GENERAL"]);
export type OperationalRequestKind = z.infer<typeof OperationalRequestKindSchema>;

const policyDocumentId = z.string().trim().min(1).max(160).nullable().default(null);
const draft = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ABSENCE"),
      firstDay: localDateSchema.nullable(),
      lastDay: localDateSchema.nullable(),
      reason: z.string().trim().max(500),
      policyDocumentId,
    })
    .strict(),
  z
    .object({
      kind: z.literal("EQUIPMENT"),
      item: z.string().trim().max(120),
      quantity: z.number().int().min(1).max(100).nullable(),
      justification: z.string().trim().max(1000),
      policyDocumentId,
    })
    .strict(),
  z
    .object({
      kind: z.literal("GENERAL"),
      subject: z.string().trim().max(120),
      details: z.string().trim().max(1000),
      policyDocumentId,
    })
    .strict(),
]);

function checkAbsenceRange(firstDay: string | null, lastDay: string | null, ctx: z.RefinementCtx) {
  if (!firstDay || !lastDay) {
    return;
  }
  const elapsed = Date.parse(lastDay) - Date.parse(firstDay);
  if (elapsed < 0 || elapsed >= 366 * 86_400_000) {
    ctx.addIssue({
      code: "custom",
      message: "Choose an inclusive range from one to 366 days",
      path: ["lastDay"],
    });
  }
}

export const OperationalRequestDraftSchema = draft.superRefine((input, ctx) => {
  if (input.kind === "ABSENCE") {
    checkAbsenceRange(input.firstDay, input.lastDay, ctx);
  }
});

export const SubmitOperationalRequestDraftSchema = draft.superRefine((input, ctx) => {
  const required = (path: string, value: string | number | null) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: "Required", path: [path] });
    }
  };
  switch (input.kind) {
    case "ABSENCE":
      required("firstDay", input.firstDay);
      required("lastDay", input.lastDay);
      checkAbsenceRange(input.firstDay, input.lastDay, ctx);
      break;
    case "EQUIPMENT":
      required("item", input.item);
      required("quantity", input.quantity);
      required("justification", input.justification);
      break;
    case "GENERAL":
      required("subject", input.subject);
      required("details", input.details);
      break;
  }
});

export const OperationalRequestVersionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();
export const UpdateOperationalRequestSchema = OperationalRequestVersionSchema.extend({
  draft: OperationalRequestDraftSchema,
});
export const LinkOperationalRequestProcedureSchema = OperationalRequestVersionSchema.extend({
  procedureId: z.string().uuid().nullable(),
});
export const OperationalRequestAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mediaType: z.string(),
  size: z.number().int().positive(),
});
export const AddOperationalRequestAttachmentSchema = OperationalRequestVersionSchema.extend({
  name: z.string().trim().min(1).max(120),
  mediaType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  base64: z
    .string()
    .min(4)
    .max(2_796_204)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});
export const OperationalRequestStatusSchema = z.enum(["DRAFT", "SUBMITTED", "WITHDRAWN"]);
export const OperationalRequestSummarySchema = z.object({
  id: z.string().uuid(),
  kind: OperationalRequestKindSchema,
  status: OperationalRequestStatusSchema,
  updatedAt: utcInstantSchema,
});
export const OperationalRequestSchema = OperationalRequestSummarySchema.extend({
  draft: OperationalRequestDraftSchema,
  version: z.number().int().positive(),
  createdAt: utcInstantSchema,
  submittedAt: utcInstantSchema.nullable(),
  withdrawnAt: utcInstantSchema.nullable(),
  attachments: z.array(OperationalRequestAttachmentSchema).max(5),
  canReadPolicy: z.boolean(),
  procedure: z
    .discriminatedUnion("state", [
      z.object({ state: z.literal("available"), id: z.string().uuid() }).strict(),
      z.object({ state: z.literal("unavailable") }).strict(),
    ])
    .nullable()
    .default(null),
});
export const OperationalRequestsPageSchema = z.object({
  items: z.array(OperationalRequestSummarySchema),
  hasMore: z.boolean(),
  canSubmit: z.boolean(),
  canManageRouting: z.boolean(),
});
export const OperationalRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export const OperationalRequestRouteSchema = z.object({
  kind: OperationalRequestKindSchema,
  reviewerUserId: z.string().nullable(),
});
export const ConfigureOperationalRequestRouteSchema = z
  .object({ reviewerUserId: z.string().min(1).max(160) })
  .strict();
export const OperationalRequestApprovalKeyPrefix = "approval.operational-request.";
export const OperationalRequestRoutingMissingCode = "REQUEST_REVIEWER_UNAVAILABLE";

export type OperationalRequest = z.infer<typeof OperationalRequestSchema>;
export type OperationalRequestDraft = z.infer<typeof OperationalRequestDraftSchema>;
export type OperationalRequestAttachment = z.infer<typeof OperationalRequestAttachmentSchema>;
export type OperationalRequestsPage = z.infer<typeof OperationalRequestsPageSchema>;
export type OperationalRequestRoute = z.infer<typeof OperationalRequestRouteSchema>;
export type AddOperationalRequestAttachment = z.infer<typeof AddOperationalRequestAttachmentSchema>;
