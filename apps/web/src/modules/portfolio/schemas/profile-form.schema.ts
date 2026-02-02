import { z } from "zod";
import type { PortfolioProfile, UpsertPortfolioProfileInput } from "@corely/contracts";
import {
  emptyToNull,
  emptyToUndefined,
  formatJson,
  joinCommaList,
  parseCommaList,
  parseJsonRecord,
} from "../utils";

export const profileFormSchema = z.object({
  introLine: z.string().optional(),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  aboutShort: z.string().optional(),
  aboutLong: z.string().optional(),
  focusBullets: z.string().optional(),
  ctaTitle: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  techStacks: z.string().optional(),
  socialLinks: z.string().optional(),
  homeSections: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export const getDefaultProfileFormValues = (): ProfileFormData => ({
  introLine: "",
  headline: "",
  subheadline: "",
  aboutShort: "",
  aboutLong: "",
  focusBullets: "",
  ctaTitle: "",
  ctaText: "",
  ctaUrl: "",
  techStacks: "",
  socialLinks: "",
  homeSections: "",
  isPublished: false,
});

export const toProfileFormValues = (profile: PortfolioProfile): ProfileFormData => ({
  introLine: profile.introLine ?? "",
  headline: profile.headline ?? "",
  subheadline: profile.subheadline ?? "",
  aboutShort: profile.aboutShort ?? "",
  aboutLong: profile.aboutLong ?? "",
  focusBullets: joinCommaList(profile.focusBullets),
  ctaTitle: profile.ctaTitle ?? "",
  ctaText: profile.ctaText ?? "",
  ctaUrl: profile.ctaUrl ?? "",
  techStacks: joinCommaList(profile.techStacks),
  socialLinks: formatJson(profile.socialLinks),
  homeSections: joinCommaList(profile.homeSections),
  isPublished: profile.isPublished ?? false,
});

export const toUpsertProfileInput = (data: ProfileFormData): UpsertPortfolioProfileInput => ({
  introLine: emptyToNull(data.introLine),
  headline: emptyToNull(data.headline),
  subheadline: emptyToNull(data.subheadline),
  aboutShort: emptyToNull(data.aboutShort),
  aboutLong: emptyToNull(data.aboutLong),
  focusBullets: parseCommaList(data.focusBullets),
  ctaTitle: emptyToNull(data.ctaTitle),
  ctaText: emptyToNull(data.ctaText),
  ctaUrl: emptyToNull(data.ctaUrl),
  techStacks: parseCommaList(data.techStacks),
  socialLinks: data.socialLinks ? (parseJsonRecord(data.socialLinks) ?? {}) : undefined,
  homeSections: parseCommaList(data.homeSections),
  isPublished: data.isPublished ?? false,
});

export const validateProfilePayload = (data: ProfileFormData): string | null => {
  if (data.socialLinks && !parseJsonRecord(data.socialLinks)) {
    return "Social links must be valid JSON object.";
  }
  if (data.homeSections && parseCommaList(data.homeSections).length === 0) {
    return "Home sections must include at least one section.";
  }
  if (data.focusBullets && parseCommaList(data.focusBullets).length === 0) {
    return "Focus bullets must include at least one item.";
  }
  if (data.techStacks && parseCommaList(data.techStacks).length === 0) {
    return "Tech stacks must include at least one item.";
  }
  return null;
};
