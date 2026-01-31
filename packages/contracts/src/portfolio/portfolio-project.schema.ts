import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  PortfolioContentStatusSchema,
  PortfolioProjectSchema,
  PortfolioProjectTypeSchema,
  PortfolioSlugSchema,
} from "./portfolio.types";

export const CreatePortfolioProjectInputSchema = z.object({
  title: z.string().min(1),
  slug: PortfolioSlugSchema,
  summary: z.string().min(1),
  content: z.string().min(1),
  type: PortfolioProjectTypeSchema,
  status: PortfolioContentStatusSchema.optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  links: z.record(z.string(), z.string()).optional().nullable(),
  techStack: z.array(z.string()).optional(),
  metrics: z.record(z.string(), z.unknown()).optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePortfolioProjectInputSchema = z.object({
  title: z.string().min(1).optional(),
  slug: PortfolioSlugSchema.optional(),
  summary: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: PortfolioProjectTypeSchema.optional(),
  status: PortfolioContentStatusSchema.optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  links: z.record(z.string(), z.string()).optional().nullable(),
  techStack: z.array(z.string()).optional(),
  metrics: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const ListPortfolioProjectsInputSchema = ListQuerySchema.extend({
  status: PortfolioContentStatusSchema.optional(),
  type: PortfolioProjectTypeSchema.optional(),
  featured: z.boolean().optional(),
});

export const ListPortfolioProjectsOutputSchema = z.object({
  items: z.array(PortfolioProjectSchema),
  pageInfo: PageInfoSchema,
});

export const GetPortfolioProjectOutputSchema = z.object({
  project: PortfolioProjectSchema,
  clientIds: z.array(z.string()).optional(),
});

export const SetProjectClientsInputSchema = z.object({
  clientIds: z.array(z.string()).default([]),
});

export type CreatePortfolioProjectInput = z.infer<typeof CreatePortfolioProjectInputSchema>;
export type UpdatePortfolioProjectInput = z.infer<typeof UpdatePortfolioProjectInputSchema>;
export type ListPortfolioProjectsInput = z.infer<typeof ListPortfolioProjectsInputSchema>;
export type ListPortfolioProjectsOutput = z.infer<typeof ListPortfolioProjectsOutputSchema>;
export type GetPortfolioProjectOutput = z.infer<typeof GetPortfolioProjectOutputSchema>;
export type SetProjectClientsInput = z.infer<typeof SetProjectClientsInputSchema>;
