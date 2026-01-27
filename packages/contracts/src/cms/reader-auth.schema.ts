import { z } from 'zod';
import { CmsReaderDtoSchema } from './cms.types';

export const CmsReaderSignUpInputSchema = z.object({
 email: z.string().email(),
 password: z.string().min(6),
 displayName: z.string().min(1).optional(),
});

export const CmsReaderLoginInputSchema = z.object({
 email: z.string().email(),
 password: z.string().min(6),
});

export const CmsReaderAuthOutputSchema = z.object({
 reader: CmsReaderDtoSchema,
 accessToken: z.string(),
});

export type CmsReaderSignUpInput = z.infer<typeof CmsReaderSignUpInputSchema>;
export type CmsReaderLoginInput = z.infer<typeof CmsReaderLoginInputSchema>;
export type CmsReaderAuthOutput = z.infer<typeof CmsReaderAuthOutputSchema>;
