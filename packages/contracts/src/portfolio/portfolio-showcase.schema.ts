import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  PortfolioShowcaseSchema,
  PortfolioShowcaseTypeSchema,
  PortfolioSlugSchema,
} from "./portfolio.types";

export const CreatePortfolioShowcaseInputSchema = z.object({
  type: PortfolioShowcaseTypeSchema,
  name: z.string().min(1),
  slug: PortfolioSlugSchema,
  primaryDomain: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePortfolioShowcaseInputSchema = z.object({
  type: PortfolioShowcaseTypeSchema.optional(),
  name: z.string().min(1).optional(),
  slug: PortfolioSlugSchema.optional(),
  primaryDomain: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
});

export const GetPortfolioShowcaseOutputSchema = z.object({
  showcase: PortfolioShowcaseSchema,
});

export const ListPortfolioShowcasesInputSchema = ListQuerySchema.extend({
  type: PortfolioShowcaseTypeSchema.optional(),
  isPublished: z.boolean().optional(),
});

export const ListPortfolioShowcasesOutputSchema = z.object({
  items: z.array(PortfolioShowcaseSchema),
  pageInfo: PageInfoSchema,
});

export type CreatePortfolioShowcaseInput = z.infer<typeof CreatePortfolioShowcaseInputSchema>;
export type UpdatePortfolioShowcaseInput = z.infer<typeof UpdatePortfolioShowcaseInputSchema>;
export type GetPortfolioShowcaseOutput = z.infer<typeof GetPortfolioShowcaseOutputSchema>;
export type ListPortfolioShowcasesInput = z.infer<typeof ListPortfolioShowcasesInputSchema>;
export type ListPortfolioShowcasesOutput = z.infer<typeof ListPortfolioShowcasesOutputSchema>;
