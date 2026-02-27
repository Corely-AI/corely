import { z } from "zod";
import { WebsiteQaScopeSchema } from "./public/website-qa-public.schema";

export const WebsiteQaStatusSchema = z.enum(["draft", "published"]);
export type WebsiteQaStatus = z.infer<typeof WebsiteQaStatusSchema>;

export const WebsiteQaSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  siteId: z.string(),
  locale: z.string(),
  scope: WebsiteQaScopeSchema,
  pageId: z.string().nullable().optional(),
  status: WebsiteQaStatusSchema,
  order: z.number().int(),
  question: z.string(),
  answerHtml: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WebsiteQa = z.infer<typeof WebsiteQaSchema>;

export const ListWebsiteQaAdminInputSchema = z.object({
  siteId: z.string(),
  locale: z.string().trim().min(1).optional(),
  scope: WebsiteQaScopeSchema.optional(),
  pageId: z.string().trim().min(1).optional(),
  status: WebsiteQaStatusSchema.optional(),
});
export type ListWebsiteQaAdminInput = z.infer<typeof ListWebsiteQaAdminInputSchema>;

export const ListWebsiteQaAdminOutputSchema = z.object({
  items: z.array(WebsiteQaSchema),
});
export type ListWebsiteQaAdminOutput = z.infer<typeof ListWebsiteQaAdminOutputSchema>;

export const CreateWebsiteQaInputSchema = z.object({
  siteId: z.string(),
  locale: z.string().trim().min(1),
  scope: WebsiteQaScopeSchema,
  pageId: z.string().trim().min(1).optional().nullable(),
  status: WebsiteQaStatusSchema.default("published"),
  order: z.number().int().default(0),
  question: z.string().trim().min(1).max(500),
  answerHtml: z.string().trim().min(1).max(50_000),
  idempotencyKey: z.string().optional(),
});
export type CreateWebsiteQaInput = z.infer<typeof CreateWebsiteQaInputSchema>;

export const UpdateWebsiteQaInputSchema = z.object({
  locale: z.string().trim().min(1).optional(),
  scope: WebsiteQaScopeSchema.optional(),
  pageId: z.string().trim().min(1).optional().nullable(),
  status: WebsiteQaStatusSchema.optional(),
  order: z.number().int().optional(),
  question: z.string().trim().min(1).max(500).optional(),
  answerHtml: z.string().trim().min(1).max(50_000).optional(),
});
export type UpdateWebsiteQaInput = z.infer<typeof UpdateWebsiteQaInputSchema>;

export const UpsertWebsiteQaOutputSchema = z.object({
  item: WebsiteQaSchema,
});
export type UpsertWebsiteQaOutput = z.infer<typeof UpsertWebsiteQaOutputSchema>;
