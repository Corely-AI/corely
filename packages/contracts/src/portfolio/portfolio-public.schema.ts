import { z } from "zod";
import {
  PortfolioClientSchema,
  PortfolioProfileSchema,
  PortfolioProjectSchema,
  PortfolioServiceSchema,
  PortfolioShowcaseSchema,
  PortfolioShowcaseTypeSchema,
  PortfolioTeamMemberSchema,
} from "./portfolio.types";
import { createPortfolioListResponseSchema } from "./portfolio-list.schema";

export const PublicPortfolioShowcaseListInputSchema = z.object({
  q: z.string().optional(),
  type: PortfolioShowcaseTypeSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const PublicPortfolioShowcasesOutputSchema =
  createPortfolioListResponseSchema(PortfolioShowcaseSchema);

export const PublicPortfolioShowcaseOutputSchema = z.object({
  showcase: PortfolioShowcaseSchema,
  profile: PortfolioProfileSchema.nullable(),
  featuredProjects: z.array(PortfolioProjectSchema),
  featuredClients: z.array(PortfolioClientSchema),
  featuredServices: z.array(PortfolioServiceSchema),
  featuredTeamMembers: z.array(PortfolioTeamMemberSchema),
});

export const PublicPortfolioProjectsOutputSchema = z.object({
  items: z.array(PortfolioProjectSchema),
});

export const PublicPortfolioProjectOutputSchema = z.object({
  project: PortfolioProjectSchema,
});

export const PublicPortfolioClientsOutputSchema = z.object({
  items: z.array(PortfolioClientSchema),
});

export const PublicPortfolioServicesOutputSchema = z.object({
  items: z.array(PortfolioServiceSchema),
});

export const PublicPortfolioTeamMembersOutputSchema = z.object({
  items: z.array(PortfolioTeamMemberSchema),
});

export type PublicPortfolioShowcaseListInput = z.infer<
  typeof PublicPortfolioShowcaseListInputSchema
>;
export type PublicPortfolioShowcasesOutput = z.infer<typeof PublicPortfolioShowcasesOutputSchema>;
export type PublicPortfolioShowcaseOutput = z.infer<typeof PublicPortfolioShowcaseOutputSchema>;
export type PublicPortfolioProjectsOutput = z.infer<typeof PublicPortfolioProjectsOutputSchema>;
export type PublicPortfolioProjectOutput = z.infer<typeof PublicPortfolioProjectOutputSchema>;
export type PublicPortfolioClientsOutput = z.infer<typeof PublicPortfolioClientsOutputSchema>;
export type PublicPortfolioServicesOutput = z.infer<typeof PublicPortfolioServicesOutputSchema>;
export type PublicPortfolioTeamMembersOutput = z.infer<
  typeof PublicPortfolioTeamMembersOutputSchema
>;
