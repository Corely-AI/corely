import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const PortfolioSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case");

export const PortfolioShowcaseTypeSchema = z.enum(["individual", "company", "hybrid"]);
export type PortfolioShowcaseType = z.infer<typeof PortfolioShowcaseTypeSchema>;

export const PortfolioProjectTypeSchema = z.enum([
  "open_source",
  "side_hustle",
  "startup",
  "agency",
  "other",
]);
export type PortfolioProjectType = z.infer<typeof PortfolioProjectTypeSchema>;

export const PortfolioClientTypeSchema = z.enum(["cto", "freelancer", "partner", "employer", "other"]);
export type PortfolioClientType = z.infer<typeof PortfolioClientTypeSchema>;

export const PortfolioContentStatusSchema = z.enum(["draft", "published", "archived"]);
export type PortfolioContentStatus = z.infer<typeof PortfolioContentStatusSchema>;

export const PortfolioSocialLinksSchema = z.record(z.string(), z.string()).optional();
export type PortfolioSocialLinks = z.infer<typeof PortfolioSocialLinksSchema>;

export const PortfolioProjectLinksSchema = z.record(z.string(), z.string()).optional();
export type PortfolioProjectLinks = z.infer<typeof PortfolioProjectLinksSchema>;

export const PortfolioProjectMetricsSchema = z.record(z.string(), z.unknown()).optional();
export type PortfolioProjectMetrics = z.infer<typeof PortfolioProjectMetricsSchema>;

export const PortfolioShowcaseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  type: PortfolioShowcaseTypeSchema,
  name: z.string(),
  slug: PortfolioSlugSchema,
  primaryDomain: z.string().optional().nullable(),
  isPublished: z.boolean(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type PortfolioShowcase = z.infer<typeof PortfolioShowcaseSchema>;

export const PortfolioProfileSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  showcaseId: z.string(),
  introLine: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  subheadline: z.string().optional().nullable(),
  aboutShort: z.string().optional().nullable(),
  aboutLong: z.string().optional().nullable(),
  focusBullets: z.array(z.string()),
  ctaTitle: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  techStacks: z.array(z.string()),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  homeSections: z.array(z.string()),
  isPublished: z.boolean(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type PortfolioProfile = z.infer<typeof PortfolioProfileSchema>;

export const PortfolioProjectSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  showcaseId: z.string(),
  title: z.string(),
  slug: PortfolioSlugSchema,
  summary: z.string(),
  content: z.string(),
  type: PortfolioProjectTypeSchema,
  status: PortfolioContentStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number().int().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  links: PortfolioProjectLinksSchema.optional().nullable(),
  techStack: z.array(z.string()),
  metrics: PortfolioProjectMetricsSchema.optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type PortfolioProject = z.infer<typeof PortfolioProjectSchema>;

export const PortfolioClientSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  showcaseId: z.string(),
  name: z.string(),
  slug: PortfolioSlugSchema,
  clientType: PortfolioClientTypeSchema,
  locationText: z.string(),
  websiteUrl: z.string().optional().nullable(),
  logoImageUrl: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  testimonialQuote: z.string().optional().nullable(),
  testimonialAuthor: z.string().optional().nullable(),
  featured: z.boolean(),
  sortOrder: z.number().int().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type PortfolioClient = z.infer<typeof PortfolioClientSchema>;

export const PortfolioProjectClientSchema = z.object({
  projectId: z.string(),
  clientId: z.string(),
});
export type PortfolioProjectClient = z.infer<typeof PortfolioProjectClientSchema>;

export const PortfolioServiceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  showcaseId: z.string(),
  name: z.string(),
  slug: PortfolioSlugSchema,
  shortDescription: z.string(),
  deliverables: z.array(z.string()),
  startingFromPrice: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  status: PortfolioContentStatusSchema,
  sortOrder: z.number().int().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type PortfolioService = z.infer<typeof PortfolioServiceSchema>;

export const PortfolioTeamMemberSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  showcaseId: z.string(),
  name: z.string(),
  roleTitle: z.string(),
  bio: z.string(),
  skills: z.array(z.string()),
  photoUrl: z.string().optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  status: PortfolioContentStatusSchema,
  sortOrder: z.number().int().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type PortfolioTeamMember = z.infer<typeof PortfolioTeamMemberSchema>;
