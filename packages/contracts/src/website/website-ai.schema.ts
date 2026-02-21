import { z } from "zod";
import { WebsitePageContentSchema, WebsiteBlockUnionSchema } from "./blocks";

export const WebsitePageBlueprintSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  template: z.string().min(1),
  suggestedPath: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  contentJson: z.object({
    type: z.literal("doc"),
    content: z.array(z.unknown()),
  }),
});
export type WebsitePageBlueprint = z.infer<typeof WebsitePageBlueprintSchema>;

export const GenerateWebsitePageInputSchema = z.object({
  siteId: z.string(),
  locale: z.string().min(2),
  pageType: z.string().min(1),
  prompt: z.string().min(1),
  brandVoice: z.string().optional(),
  suggestedPath: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type GenerateWebsitePageInput = z.infer<typeof GenerateWebsitePageInputSchema>;

export const GenerateWebsitePageOutputSchema = z.object({
  pageId: z.string(),
  cmsEntryId: z.string(),
  blueprint: WebsitePageBlueprintSchema,
  previewSummary: z.string(),
});
export type GenerateWebsitePageOutput = z.infer<typeof GenerateWebsitePageOutputSchema>;

export const GenerateWebsiteBlocksInputSchema = z.object({
  templateKey: z.string().min(1),
  locale: z.string().min(2),
  brief: z.string().min(1),
  existingBlocks: z.array(WebsiteBlockUnionSchema).optional(),
  lockedBlockIds: z.array(z.string().min(1)).optional(),
});
export type GenerateWebsiteBlocksInput = z.infer<typeof GenerateWebsiteBlocksInputSchema>;

export const GenerateWebsiteBlocksOutputSchema = z.object({
  content: WebsitePageContentSchema,
});
export type GenerateWebsiteBlocksOutput = z.infer<typeof GenerateWebsiteBlocksOutputSchema>;

export const RegenerateWebsiteBlockInputSchema = z.object({
  templateKey: z.string().min(1),
  blockType: z.string().min(1),
  currentBlock: WebsiteBlockUnionSchema,
  instruction: z.string().min(1),
});
export type RegenerateWebsiteBlockInput = z.infer<typeof RegenerateWebsiteBlockInputSchema>;

export const RegenerateWebsiteBlockOutputSchema = z.object({
  block: WebsiteBlockUnionSchema,
});
export type RegenerateWebsiteBlockOutput = z.infer<typeof RegenerateWebsiteBlockOutputSchema>;
