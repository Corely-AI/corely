import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { ChannelKeySchema } from "./activity.types";

const channelTemplateNameSchema = z.string().trim().min(1).max(120);
const channelTemplateBodySchema = z.string().trim().min(1).max(20000);
const channelTemplateSubjectSchema = z.string().trim().min(1).max(300);

const enforceChannelTemplateRules = (
  value: { channel: string; subject?: string | null | undefined },
  ctx: z.RefinementCtx
) => {
  if (value.channel === "email" && !value.subject?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subject"],
      message: "subject is required for email templates",
    });
  }
};

export const ChannelTemplateDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  channel: ChannelKeySchema,
  name: channelTemplateNameSchema,
  subject: z.string().nullable(),
  body: z.string(),
  createdByUserId: z.string().nullable().optional(),
  updatedByUserId: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ChannelTemplateDto = z.infer<typeof ChannelTemplateDtoSchema>;

export const SystemChannelTemplateDtoSchema = z.object({
  id: z.string(),
  channel: ChannelKeySchema,
  name: channelTemplateNameSchema,
  subject: z.string().nullable(),
  body: z.string(),
});
export type SystemChannelTemplateDto = z.infer<typeof SystemChannelTemplateDtoSchema>;

export const ListChannelTemplatesQuerySchema = z.object({
  workspaceId: z.string().min(1),
  channel: ChannelKeySchema.optional(),
  q: z.string().trim().min(1).max(120).optional(),
});
export type ListChannelTemplatesQuery = z.infer<typeof ListChannelTemplatesQuerySchema>;

export const ListChannelTemplatesOutputSchema = z.object({
  workspaceTemplates: z.array(ChannelTemplateDtoSchema),
  systemTemplates: z.array(SystemChannelTemplateDtoSchema),
  defaultTemplateId: z.string().nullable().optional(),
});
export type ListChannelTemplatesOutput = z.infer<typeof ListChannelTemplatesOutputSchema>;

export const CreateChannelTemplateInputSchema = z
  .object({
    workspaceId: z.string().min(1),
    channel: ChannelKeySchema,
    name: channelTemplateNameSchema,
    subject: channelTemplateSubjectSchema.optional().nullable(),
    body: channelTemplateBodySchema,
  })
  .superRefine(enforceChannelTemplateRules);
export type CreateChannelTemplateInput = z.infer<typeof CreateChannelTemplateInputSchema>;

export const CreateChannelTemplateOutputSchema = z.object({
  template: ChannelTemplateDtoSchema,
});
export type CreateChannelTemplateOutput = z.infer<typeof CreateChannelTemplateOutputSchema>;

export const UpdateChannelTemplateInputSchema = z
  .object({
    templateId: z.string().min(1),
    workspaceId: z.string().min(1),
    channel: ChannelKeySchema,
    name: channelTemplateNameSchema,
    subject: channelTemplateSubjectSchema.optional().nullable(),
    body: channelTemplateBodySchema,
  })
  .superRefine(enforceChannelTemplateRules);
export type UpdateChannelTemplateInput = z.infer<typeof UpdateChannelTemplateInputSchema>;

export const UpdateChannelTemplateOutputSchema = z.object({
  template: ChannelTemplateDtoSchema,
});
export type UpdateChannelTemplateOutput = z.infer<typeof UpdateChannelTemplateOutputSchema>;

export const DeleteChannelTemplateInputSchema = z.object({
  templateId: z.string().min(1),
  workspaceId: z.string().min(1),
});
export type DeleteChannelTemplateInput = z.infer<typeof DeleteChannelTemplateInputSchema>;

export const DeleteChannelTemplateOutputSchema = z.object({
  deleted: z.literal(true),
});
export type DeleteChannelTemplateOutput = z.infer<typeof DeleteChannelTemplateOutputSchema>;

export const SetDefaultChannelTemplateInputSchema = z.object({
  workspaceId: z.string().min(1),
  channel: ChannelKeySchema,
  templateId: z.string().nullable(),
});
export type SetDefaultChannelTemplateInput = z.infer<typeof SetDefaultChannelTemplateInputSchema>;

export const SetDefaultChannelTemplateOutputSchema = z.object({
  defaultTemplateId: z.string().nullable(),
});
export type SetDefaultChannelTemplateOutput = z.infer<typeof SetDefaultChannelTemplateOutputSchema>;

export const GenerateChannelTemplateAiInputSchema = z.object({
  workspaceId: z.string().min(1),
  channel: ChannelKeySchema,
  context: z.string().trim().max(4000).optional(),
  workspaceLanguage: z.string().optional(),
});
export type GenerateChannelTemplateAiInput = z.infer<typeof GenerateChannelTemplateAiInputSchema>;

export const GenerateChannelTemplateAiOutputSchema = z.object({
  subject: z.string().nullable(),
  body: channelTemplateBodySchema,
});
export type GenerateChannelTemplateAiOutput = z.infer<typeof GenerateChannelTemplateAiOutputSchema>;
