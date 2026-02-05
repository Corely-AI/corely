import { z } from "zod";

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
