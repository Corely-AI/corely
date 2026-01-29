import { z } from "zod";

export const PublishFormInputSchema = z.object({
  regenerateToken: z.boolean().optional(),
});

export const PublishFormOutputSchema = z.object({
  publicId: z.string(),
  token: z.string(),
  url: z.string().optional(),
});

export type PublishFormInput = z.infer<typeof PublishFormInputSchema>;
export type PublishFormOutput = z.infer<typeof PublishFormOutputSchema>;
