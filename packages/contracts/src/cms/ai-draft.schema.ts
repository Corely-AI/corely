import { z } from 'zod';

export const GenerateCmsDraftInputSchema = z.object({
 topic: z.string().min(1),
 keyword: z.string().min(1),
 tone: z.string().optional(),
 language: z.string().optional(),
});

export const GenerateCmsDraftOutputSchema = z.object({
 title: z.string(),
 excerpt: z.string(),
 slugSuggestion: z.string(),
 metaTitle: z.string(),
 metaDescription: z.string(),
 contentJson: z.unknown(),
});

export type GenerateCmsDraftInput = z.infer<typeof GenerateCmsDraftInputSchema>;
export type GenerateCmsDraftOutput = z.infer<typeof GenerateCmsDraftOutputSchema>;
