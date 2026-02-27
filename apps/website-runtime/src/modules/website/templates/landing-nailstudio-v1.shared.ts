import type {
  WebsiteBookingStep,
  WebsiteFaqItem,
  WebsiteFooterLink,
  WebsiteLocationHour,
  WebsiteMenuPublic,
  WebsitePriceMenuCategory,
  WebsiteServiceItem,
  WebsiteSignatureSet,
  WebsiteSiteSettings,
  WebsiteTeamMember,
  WebsiteTestimonialItem,
} from "@corely/contracts";
import { buildPublicFileUrl } from "@/lib/public-api";
import {
  type CommonBlockProps,
  type RuntimeProps,
  normalizeMenuItems,
  resolveMenu,
} from "./template-runtime-shared";

export type NailStickyNavProps = CommonBlockProps &
  RuntimeProps & {
    navLabel?: string;
    ctaLabel?: string;
    ctaHref?: string;
    logoFileId?: string;
  };

export type NailHeroProps = CommonBlockProps &
  RuntimeProps & {
    eyebrow?: string;
    headline?: string;
    subheadline?: string;
    primaryCtaLabel?: string;
    primaryCtaHref?: string;
    secondaryCtaLabel?: string;
    secondaryCtaHref?: string;
    heroImageFileId?: string;
    highlights?: string[];
  };

export type NailServicesGridProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    intro?: string;
    items?: WebsiteServiceItem[];
  };

export type NailPriceMenuProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    intro?: string;
    categories?: WebsitePriceMenuCategory[];
  };

export type NailGalleryMasonryProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    intro?: string;
    imageFileIds?: string[];
  };

export type NailSignatureSetsProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    intro?: string;
    sets?: WebsiteSignatureSet[];
    ctaLabel?: string;
    ctaHref?: string;
  };

export type NailTeamProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    intro?: string;
    members?: WebsiteTeamMember[];
  };

export type NailTestimonialsProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    items?: WebsiteTestimonialItem[];
  };

export type NailBookingStepsProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    intro?: string;
    steps?: WebsiteBookingStep[];
    ctaLabel?: string;
    ctaHref?: string;
  };

export type NailLocationHoursProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    address?: string;
    phone?: string;
    mapEmbedUrl?: string;
    hours?: WebsiteLocationHour[];
    policies?: string[];
  };

export type NailFaqProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    items?: WebsiteFaqItem[];
  };

export type NailLeadFormProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    formId?: string;
    submitLabel?: string;
    note?: string;
  };

export type NailFooterProps = CommonBlockProps &
  RuntimeProps & {
    copyrightText?: string;
    links?: WebsiteFooterLink[];
  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

export const asStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item));
};

export const toServiceItems = (value: unknown): WebsiteServiceItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: WebsiteServiceItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = asString(item.name);
    if (!name) {
      continue;
    }
    const normalized: WebsiteServiceItem = { name };
    const description = asString(item.description);
    const duration = asString(item.duration);
    const priceFrom = asString(item.priceFrom);
    const imageFileId = asString(item.imageFileId);
    if (description) {
      normalized.description = description;
    }
    if (duration) {
      normalized.duration = duration;
    }
    if (priceFrom) {
      normalized.priceFrom = priceFrom;
    }
    if (imageFileId) {
      normalized.imageFileId = imageFileId;
    }
    items.push(normalized);
  }
  return items;
};

export const toPriceMenuCategories = (value: unknown): WebsitePriceMenuCategory[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const categories: WebsitePriceMenuCategory[] = [];
  for (const category of value) {
    if (!isRecord(category)) {
      continue;
    }
    const title = asString(category.title);
    if (!title) {
      continue;
    }
    const items: WebsitePriceMenuCategory["items"] = [];
    if (Array.isArray(category.items)) {
      for (const item of category.items) {
        if (!isRecord(item)) {
          continue;
        }
        const name = asString(item.name);
        const priceFrom = asString(item.priceFrom);
        if (!name || !priceFrom) {
          continue;
        }
        const normalizedItem: WebsitePriceMenuCategory["items"][number] = { name, priceFrom };
        const duration = asString(item.duration);
        const note = asString(item.note);
        if (duration) {
          normalizedItem.duration = duration;
        }
        if (note) {
          normalizedItem.note = note;
        }
        items.push(normalizedItem);
      }
    }
    categories.push({ title, items });
  }
  return categories;
};

export const toSignatureSets = (value: unknown): WebsiteSignatureSet[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const sets: WebsiteSignatureSet[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = asString(item.name);
    if (!name) {
      continue;
    }
    const normalized: WebsiteSignatureSet = { name };
    const description = asString(item.description);
    const duration = asString(item.duration);
    const priceFrom = asString(item.priceFrom);
    const badge = asString(item.badge);
    if (description) {
      normalized.description = description;
    }
    if (duration) {
      normalized.duration = duration;
    }
    if (priceFrom) {
      normalized.priceFrom = priceFrom;
    }
    if (badge) {
      normalized.badge = badge;
    }
    sets.push(normalized);
  }
  return sets;
};

export const toTeamMembers = (value: unknown): WebsiteTeamMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const members: WebsiteTeamMember[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = asString(item.name);
    if (!name) {
      continue;
    }
    const normalized: WebsiteTeamMember = { name };
    const role = asString(item.role);
    const specialty = asString(item.specialty);
    const bio = asString(item.bio);
    const imageFileId = asString(item.imageFileId);
    if (role) {
      normalized.role = role;
    }
    if (specialty) {
      normalized.specialty = specialty;
    }
    if (bio) {
      normalized.bio = bio;
    }
    if (imageFileId) {
      normalized.imageFileId = imageFileId;
    }
    members.push(normalized);
  }
  return members;
};

export const toTestimonials = (value: unknown): WebsiteTestimonialItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const testimonials: WebsiteTestimonialItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const quote = asString(item.quote);
    if (!quote) {
      continue;
    }
    const normalized: WebsiteTestimonialItem = { quote };
    const author = asString(item.author);
    const rating =
      typeof item.rating === "number" && Number.isInteger(item.rating) ? item.rating : undefined;
    if (author) {
      normalized.author = author;
    }
    if (rating) {
      normalized.rating = rating;
    }
    testimonials.push(normalized);
  }
  return testimonials;
};

export const toBookingSteps = (value: unknown): WebsiteBookingStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const steps: WebsiteBookingStep[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const title = asString(item.title);
    if (!title) {
      continue;
    }
    const normalized: WebsiteBookingStep = { title };
    const description = asString(item.description);
    if (description) {
      normalized.description = description;
    }
    steps.push(normalized);
  }
  return steps;
};

export const toLocationHours = (value: unknown): WebsiteLocationHour[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const hours: WebsiteLocationHour[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const day = asString(item.day);
    const open = asString(item.open);
    const close = asString(item.close);
    if (!day || !open || !close) {
      continue;
    }
    hours.push({ day, open, close });
  }
  return hours;
};

export const toFaqItems = (value: unknown): WebsiteFaqItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: WebsiteFaqItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const question = asString(item.question);
    const answer = asString(item.answer);
    if (!question || !answer) {
      continue;
    }
    items.push({ question, answer });
  }
  return items;
};

export const toFooterLinks = (value: unknown): WebsiteFooterLink[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const links: WebsiteFooterLink[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const label = asString(item.label);
    const href = asString(item.href);
    if (!label || !href) {
      continue;
    }
    links.push({ label, href });
  }
  return links;
};

export const resolveFileUrl = (fileId?: string): string | undefined =>
  fileId && fileId.trim().length > 0 ? buildPublicFileUrl(fileId) : undefined;

export const resolveNavItems = (
  menus: WebsiteMenuPublic[] | undefined
): { label: string; href: string }[] => {
  const headerMenu = resolveMenu(menus, "header");
  const fromMenu = normalizeMenuItems(headerMenu?.itemsJson);
  if (fromMenu.length > 0) {
    return fromMenu;
  }
  return [
    { label: "Services", href: "#services" },
    { label: "Preise", href: "#preise" },
    { label: "Galerie", href: "#galerie" },
    { label: "Kontakt", href: "#kontakt" },
  ];
};

export const commonSiteTitle = (settings: WebsiteSiteSettings | undefined): string =>
  settings?.common?.siteTitle?.trim() || "Nail Atelier Berlin";

export const commonPrimaryCta = (
  settings: WebsiteSiteSettings | undefined
): { label: string; href: string } => {
  const fromSettings = settings?.common?.header?.cta;
  return {
    label: fromSettings?.label?.trim() || "Jetzt buchen",
    href: fromSettings?.href?.trim() || "#booking",
  };
};
