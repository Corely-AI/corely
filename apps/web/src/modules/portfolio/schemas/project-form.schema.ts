import { z } from "zod";
import type {
  CreatePortfolioProjectInput,
  PortfolioProject,
  UpdatePortfolioProjectInput,
} from "@corely/contracts";
import {
  PortfolioContentStatusSchema,
  PortfolioProjectTypeSchema,
  PortfolioSlugSchema,
} from "@corely/contracts";
import {
  emptyToNull,
  emptyToUndefined,
  formatJson,
  joinCommaList,
  parseCommaList,
  parseJsonRecord,
  parseOptionalNumber,
} from "../utils";

export const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: PortfolioSlugSchema,
  summary: z.string().min(1, "Summary is required"),
  content: z.string().min(1, "Content is required"),
  type: PortfolioProjectTypeSchema,
  status: PortfolioContentStatusSchema,
  featured: z.boolean().optional(),
  sortOrder: z.union([z.string(), z.number()]).optional(),
  coverImageUrl: z.string().optional(),
  techStack: z.string().optional(),
  links: z.string().optional(),
  metrics: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

export const getDefaultProjectFormValues = (): ProjectFormData => ({
  title: "",
  slug: "",
  summary: "",
  content: "",
  type: "startup",
  status: "draft",
  featured: false,
  sortOrder: "",
  coverImageUrl: "",
  techStack: "",
  links: "",
  metrics: "",
  clientIds: [],
});

export const toProjectFormValues = (
  project: PortfolioProject,
  clientIds?: string[]
): ProjectFormData => ({
  title: project.title ?? "",
  slug: project.slug ?? "",
  summary: project.summary ?? "",
  content: project.content ?? "",
  type: project.type,
  status: project.status,
  featured: project.featured ?? false,
  sortOrder: project.sortOrder ?? "",
  coverImageUrl: project.coverImageUrl ?? "",
  techStack: joinCommaList(project.techStack),
  links: formatJson(project.links),
  metrics: formatJson(project.metrics),
  clientIds: clientIds ?? [],
});

export const toCreateProjectInput = (data: ProjectFormData): CreatePortfolioProjectInput => ({
  title: data.title.trim(),
  slug: data.slug.trim(),
  summary: data.summary.trim(),
  content: data.content.trim(),
  type: data.type,
  status: data.status,
  featured: data.featured ?? false,
  sortOrder: parseOptionalNumber(data.sortOrder),
  coverImageUrl: emptyToUndefined(data.coverImageUrl),
  techStack: parseCommaList(data.techStack),
  links: data.links ? parseJsonRecord(data.links) ?? {} : undefined,
  metrics: data.metrics ? parseJsonRecord(data.metrics) ?? {} : undefined,
});

export const toUpdateProjectInput = (data: ProjectFormData): UpdatePortfolioProjectInput => ({
  title: data.title.trim(),
  slug: data.slug.trim(),
  summary: data.summary.trim(),
  content: data.content.trim(),
  type: data.type,
  status: data.status,
  featured: data.featured ?? false,
  sortOrder: parseOptionalNumber(data.sortOrder),
  coverImageUrl: emptyToNull(data.coverImageUrl),
  techStack: parseCommaList(data.techStack),
  links: data.links ? parseJsonRecord(data.links) ?? {} : null,
  metrics: data.metrics ? parseJsonRecord(data.metrics) ?? {} : null,
});

export const validateProjectPayload = (data: ProjectFormData): string | null => {
  if (data.links && !parseJsonRecord(data.links)) {
    return "Links must be valid JSON object.";
  }
  if (data.metrics && !parseJsonRecord(data.metrics)) {
    return "Metrics must be valid JSON object.";
  }
  return null;
};
