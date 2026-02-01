import { z } from "zod";

// --- Preset & Operation ---

export const RichTextPresetIdSchema = z.union([
  z.literal("rental-description"),
  z.literal("cms-body"),
  z.literal("portfolio-description"),
  z.literal("generic"),
]);
export type RichTextPresetId = z.infer<typeof RichTextPresetIdSchema>;

export const RichTextAiOperationSchema = z.union([
  z.literal("generate"),
  z.literal("rewrite"),
  z.literal("shorten"),
  z.literal("expand"),
  z.literal("fix_grammar"),
  z.literal("change_tone"),
  z.literal("translate"),
  z.literal("extract_summary"),
]);
export type RichTextAiOperation = z.infer<typeof RichTextAiOperationSchema>;

// --- Request ---

export const RichTextAiRequestSchema = z.object({
  presetId: RichTextPresetIdSchema,
  operation: RichTextAiOperationSchema,

  // Editor State
  fullHtml: z.string(),
  selectionHtml: z.string().optional(),
  userInstruction: z.string().optional(),
  targetLanguage: z.string().optional(), // BCP-47 tag e.g. "en", "de"
  tone: z
    .union([
      z.literal("neutral"),
      z.literal("friendly"),
      z.literal("professional"),
      z.literal("luxury"),
      z.literal("casual"),
    ])
    .optional(),

  // Safety/Constraints
  allowedTags: z.array(z.string()),
  allowLinks: z.boolean(),

  // Context Hooks
  entityContext: z
    .object({
      module: z.string(), // "rentals" | "cms" | ...
      entityType: z.string(), // "RentalProperty" | "CmsPage" | ...
      entityId: z.string().optional(),
      workspaceId: z.string().optional(),
      tenantId: z.string().optional(),
    })
    .optional(),
});
export type RichTextAiRequest = z.infer<typeof RichTextAiRequestSchema>;

// --- Response ---

export const RichTextAiResponseModeSchema = z.union([
  z.literal("replace_selection"),
  z.literal("replace_all"),
  z.literal("append"),
  z.literal("insert_after_selection"),
]);

export const RichTextAiResponseSchema = z.object({
  mode: RichTextAiResponseModeSchema,
  html: z.string(), // must only use allowedTags
  summary: z.string(), // 1 sentence describing what changed
  warnings: z.array(z.string()).default([]), // e.g. ["Missing facts: amenities, check-in policy"]
  followUpQuestions: z.array(z.string()).default([]), // questions if user needs to supply info
});
export type RichTextAiResponse = z.infer<typeof RichTextAiResponseSchema>;
