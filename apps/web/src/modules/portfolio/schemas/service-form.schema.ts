import { z } from "zod";
import type {
  CreatePortfolioServiceInput,
  PortfolioService,
  UpdatePortfolioServiceInput,
} from "@corely/contracts";
import { PortfolioContentStatusSchema, PortfolioSlugSchema } from "@corely/contracts";
import {
  emptyToNull,
  emptyToUndefined,
  joinCommaList,
  parseCommaList,
  parseOptionalNumber,
} from "../utils";

export const serviceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: PortfolioSlugSchema,
  shortDescription: z.string().min(1, "Short description is required"),
  deliverables: z.string().optional(),
  startingFromPrice: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  status: PortfolioContentStatusSchema,
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

export type ServiceFormData = z.infer<typeof serviceFormSchema>;

export const getDefaultServiceFormValues = (): ServiceFormData => ({
  name: "",
  slug: "",
  shortDescription: "",
  deliverables: "",
  startingFromPrice: "",
  ctaText: "",
  ctaUrl: "",
  status: "draft",
  sortOrder: "",
});

export const toServiceFormValues = (service: PortfolioService): ServiceFormData => ({
  name: service.name ?? "",
  slug: service.slug ?? "",
  shortDescription: service.shortDescription ?? "",
  deliverables: joinCommaList(service.deliverables),
  startingFromPrice: service.startingFromPrice ?? "",
  ctaText: service.ctaText ?? "",
  ctaUrl: service.ctaUrl ?? "",
  status: service.status,
  sortOrder: service.sortOrder ?? "",
});

export const toCreateServiceInput = (data: ServiceFormData): CreatePortfolioServiceInput => ({
  name: data.name.trim(),
  slug: data.slug.trim(),
  shortDescription: data.shortDescription.trim(),
  deliverables: parseCommaList(data.deliverables),
  startingFromPrice: emptyToUndefined(data.startingFromPrice),
  ctaText: emptyToUndefined(data.ctaText),
  ctaUrl: emptyToUndefined(data.ctaUrl),
  status: data.status,
  sortOrder: parseOptionalNumber(data.sortOrder),
});

export const toUpdateServiceInput = (data: ServiceFormData): UpdatePortfolioServiceInput => ({
  name: data.name.trim(),
  slug: data.slug.trim(),
  shortDescription: data.shortDescription.trim(),
  deliverables: parseCommaList(data.deliverables),
  startingFromPrice: emptyToNull(data.startingFromPrice),
  ctaText: emptyToNull(data.ctaText),
  ctaUrl: emptyToNull(data.ctaUrl),
  status: data.status,
  sortOrder: parseOptionalNumber(data.sortOrder),
});
