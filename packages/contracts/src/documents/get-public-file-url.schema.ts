import { z } from 'zod';
import { utcInstantSchema } from '../shared/local-date.schema';

export const GetPublicFileUrlInputSchema = z.object({
 fileId: z.string().min(1),
});

export const GetPublicFileUrlOutputSchema = z.object({
 url: z.string(),
 expiresAt: utcInstantSchema,
});

export type GetPublicFileUrlInput = z.infer<typeof GetPublicFileUrlInputSchema>;
export type GetPublicFileUrlOutput = z.infer<typeof GetPublicFileUrlOutputSchema>;
