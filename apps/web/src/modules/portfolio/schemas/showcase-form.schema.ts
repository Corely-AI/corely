import { z } from "zod";
import type {
  CreatePortfolioShowcaseInput,
  PortfolioShowcase,
  UpdatePortfolioShowcaseInput,
} from "@corely/contracts";
import { PortfolioShowcaseTypeSchema, PortfolioSlugSchema } from "@corely/contracts";
import { emptyToNull, emptyToUndefined } from "../utils";

export const showcaseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: PortfolioSlugSchema,
  type: PortfolioShowcaseTypeSchema,
  primaryDomain: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export type ShowcaseFormData = z.infer<typeof showcaseFormSchema>;

export const getDefaultShowcaseFormValues = (): ShowcaseFormData => ({
  name: "",
  slug: "",
  type: "individual",
  primaryDomain: "",
  isPublished: false,
});

export const toShowcaseFormValues = (showcase: PortfolioShowcase): ShowcaseFormData => ({
  name: showcase.name ?? "",
  slug: showcase.slug ?? "",
  type: showcase.type,
  primaryDomain: showcase.primaryDomain ?? "",
  isPublished: showcase.isPublished ?? false,
});

export const toCreateShowcaseInput = (data: ShowcaseFormData): CreatePortfolioShowcaseInput => ({
  name: data.name.trim(),
  slug: data.slug.trim(),
  type: data.type,
  primaryDomain: emptyToUndefined(data.primaryDomain),
  isPublished: data.isPublished,
});

export const toUpdateShowcaseInput = (data: ShowcaseFormData): UpdatePortfolioShowcaseInput => ({
  name: data.name.trim(),
  slug: data.slug.trim(),
  type: data.type,
  primaryDomain: emptyToNull(data.primaryDomain),
  isPublished: data.isPublished,
});
