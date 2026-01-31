import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  PortfolioContentStatusSchema,
  PortfolioServiceSchema,
  PortfolioSlugSchema,
} from "./portfolio.types";

export const CreatePortfolioServiceInputSchema = z.object({
  name: z.string().min(1),
  slug: PortfolioSlugSchema,
  shortDescription: z.string().min(1),
  deliverables: z.array(z.string()).optional(),
  startingFromPrice: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  status: PortfolioContentStatusSchema.optional(),
  sortOrder: z.number().int().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePortfolioServiceInputSchema = z.object({
  name: z.string().min(1).optional(),
  slug: PortfolioSlugSchema.optional(),
  shortDescription: z.string().min(1).optional(),
  deliverables: z.array(z.string()).optional(),
  startingFromPrice: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  status: PortfolioContentStatusSchema.optional(),
  sortOrder: z.number().int().optional().nullable(),
});

export const ListPortfolioServicesInputSchema = ListQuerySchema.extend({
  status: PortfolioContentStatusSchema.optional(),
});

export const ListPortfolioServicesOutputSchema = z.object({
  items: z.array(PortfolioServiceSchema),
  pageInfo: PageInfoSchema,
});

export const GetPortfolioServiceOutputSchema = z.object({
  service: PortfolioServiceSchema,
});

export type CreatePortfolioServiceInput = z.infer<typeof CreatePortfolioServiceInputSchema>;
export type UpdatePortfolioServiceInput = z.infer<typeof UpdatePortfolioServiceInputSchema>;
export type ListPortfolioServicesInput = z.infer<typeof ListPortfolioServicesInputSchema>;
export type ListPortfolioServicesOutput = z.infer<typeof ListPortfolioServicesOutputSchema>;
export type GetPortfolioServiceOutput = z.infer<typeof GetPortfolioServiceOutputSchema>;
