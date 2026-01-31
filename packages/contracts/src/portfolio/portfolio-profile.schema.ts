import { z } from "zod";
import { PortfolioProfileSchema } from "./portfolio.types";

export const UpsertPortfolioProfileInputSchema = z.object({
  introLine: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  subheadline: z.string().optional().nullable(),
  aboutShort: z.string().optional().nullable(),
  aboutLong: z.string().optional().nullable(),
  focusBullets: z.array(z.string()).optional(),
  ctaTitle: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  techStacks: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  homeSections: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export const GetPortfolioProfileOutputSchema = z.object({
  profile: PortfolioProfileSchema,
});

export type UpsertPortfolioProfileInput = z.infer<typeof UpsertPortfolioProfileInputSchema>;
export type GetPortfolioProfileOutput = z.infer<typeof GetPortfolioProfileOutputSchema>;
