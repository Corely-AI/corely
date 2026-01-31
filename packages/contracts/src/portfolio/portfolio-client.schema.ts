import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  PortfolioClientSchema,
  PortfolioClientTypeSchema,
  PortfolioSlugSchema,
} from "./portfolio.types";

export const CreatePortfolioClientInputSchema = z.object({
  name: z.string().min(1),
  slug: PortfolioSlugSchema,
  clientType: PortfolioClientTypeSchema,
  locationText: z.string().min(1),
  websiteUrl: z.string().optional().nullable(),
  logoImageUrl: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  testimonialQuote: z.string().optional().nullable(),
  testimonialAuthor: z.string().optional().nullable(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePortfolioClientInputSchema = z.object({
  name: z.string().min(1).optional(),
  slug: PortfolioSlugSchema.optional(),
  clientType: PortfolioClientTypeSchema.optional(),
  locationText: z.string().min(1).optional(),
  websiteUrl: z.string().optional().nullable(),
  logoImageUrl: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  testimonialQuote: z.string().optional().nullable(),
  testimonialAuthor: z.string().optional().nullable(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional().nullable(),
});

export const ListPortfolioClientsInputSchema = ListQuerySchema.extend({
  clientType: PortfolioClientTypeSchema.optional(),
  featured: z.boolean().optional(),
});

export const ListPortfolioClientsOutputSchema = z.object({
  items: z.array(PortfolioClientSchema),
  pageInfo: PageInfoSchema,
});

export const GetPortfolioClientOutputSchema = z.object({
  client: PortfolioClientSchema,
});

export type CreatePortfolioClientInput = z.infer<typeof CreatePortfolioClientInputSchema>;
export type UpdatePortfolioClientInput = z.infer<typeof UpdatePortfolioClientInputSchema>;
export type ListPortfolioClientsInput = z.infer<typeof ListPortfolioClientsInputSchema>;
export type ListPortfolioClientsOutput = z.infer<typeof ListPortfolioClientsOutputSchema>;
export type GetPortfolioClientOutput = z.infer<typeof GetPortfolioClientOutputSchema>;
