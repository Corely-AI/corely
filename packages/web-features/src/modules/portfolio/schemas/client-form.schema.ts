import { z } from "zod";
import type {
  CreatePortfolioClientInput,
  PortfolioClient,
  UpdatePortfolioClientInput,
} from "@corely/contracts";
import { PortfolioClientTypeSchema, PortfolioSlugSchema } from "@corely/contracts";
import { emptyToNull, emptyToUndefined, parseOptionalNumber } from "../utils";

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: PortfolioSlugSchema,
  clientType: PortfolioClientTypeSchema,
  locationText: z.string().min(1, "Location is required"),
  websiteUrl: z.string().optional(),
  logoImageUrl: z.string().optional(),
  summary: z.string().optional(),
  testimonialQuote: z.string().optional(),
  testimonialAuthor: z.string().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

export const getDefaultClientFormValues = (): ClientFormData => ({
  name: "",
  slug: "",
  clientType: "partner",
  locationText: "",
  websiteUrl: "",
  logoImageUrl: "",
  summary: "",
  testimonialQuote: "",
  testimonialAuthor: "",
  featured: false,
  sortOrder: "",
});

export const toClientFormValues = (client: PortfolioClient): ClientFormData => ({
  name: client.name ?? "",
  slug: client.slug ?? "",
  clientType: client.clientType,
  locationText: client.locationText ?? "",
  websiteUrl: client.websiteUrl ?? "",
  logoImageUrl: client.logoImageUrl ?? "",
  summary: client.summary ?? "",
  testimonialQuote: client.testimonialQuote ?? "",
  testimonialAuthor: client.testimonialAuthor ?? "",
  featured: client.featured ?? false,
  sortOrder: client.sortOrder ?? "",
});

export const toCreateClientInput = (data: ClientFormData): CreatePortfolioClientInput => ({
  name: data.name.trim(),
  slug: data.slug.trim(),
  clientType: data.clientType,
  locationText: data.locationText.trim(),
  websiteUrl: emptyToUndefined(data.websiteUrl),
  logoImageUrl: emptyToUndefined(data.logoImageUrl),
  summary: emptyToUndefined(data.summary),
  testimonialQuote: emptyToUndefined(data.testimonialQuote),
  testimonialAuthor: emptyToUndefined(data.testimonialAuthor),
  featured: data.featured ?? false,
  sortOrder: parseOptionalNumber(data.sortOrder),
});

export const toUpdateClientInput = (data: ClientFormData): UpdatePortfolioClientInput => ({
  name: data.name.trim(),
  slug: data.slug.trim(),
  clientType: data.clientType,
  locationText: data.locationText.trim(),
  websiteUrl: emptyToNull(data.websiteUrl),
  logoImageUrl: emptyToNull(data.logoImageUrl),
  summary: emptyToNull(data.summary),
  testimonialQuote: emptyToNull(data.testimonialQuote),
  testimonialAuthor: emptyToNull(data.testimonialAuthor),
  featured: data.featured ?? false,
  sortOrder: parseOptionalNumber(data.sortOrder),
});
