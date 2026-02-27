import type { ComponentProps } from "react";
import {
  type NailStudioBookingStepsView,
  type NailStudioFaqView,
  type NailStudioFooterView,
  type NailStudioLocationHoursView,
  type NailStudioPriceMenuView,
  type NailStudioServicesGridView,
  type NailStudioSignatureSetsView,
  type NailStudioTeamView,
  type NailStudioTestimonialsView,
} from "@corely/website-blocks";
import { buildPublicFileUrl } from "@/lib/cms-api";
import { asNonEmptyString } from "./website-page-editor.utils";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const toServiceItems = (
  value: unknown
): ComponentProps<typeof NailStudioServicesGridView>["services"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const name = asNonEmptyString(item.name);
      if (!name) {
        return null;
      }
      return {
        name,
        description: asNonEmptyString(item.description),
        duration: asNonEmptyString(item.duration),
        priceFrom: asNonEmptyString(item.priceFrom),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toPriceMenuCategories = (
  value: unknown
): ComponentProps<typeof NailStudioPriceMenuView>["categories"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((category) => {
      if (!isRecord(category)) {
        return null;
      }
      const title = asNonEmptyString(category.title);
      if (!title) {
        return null;
      }
      const items = Array.isArray(category.items)
        ? category.items
            .map((item) => {
              if (!isRecord(item)) {
                return null;
              }
              const name = asNonEmptyString(item.name);
              const priceFrom = asNonEmptyString(item.priceFrom);
              if (!name || !priceFrom) {
                return null;
              }
              return {
                name,
                priceFrom,
                duration: asNonEmptyString(item.duration),
                note: asNonEmptyString(item.note),
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];
      return { title, items };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toSignatureSets = (
  value: unknown
): ComponentProps<typeof NailStudioSignatureSetsView>["sets"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((set) => {
      if (!isRecord(set)) {
        return null;
      }
      const name = asNonEmptyString(set.name);
      if (!name) {
        return null;
      }
      return {
        name,
        description: asNonEmptyString(set.description),
        duration: asNonEmptyString(set.duration),
        priceFrom: asNonEmptyString(set.priceFrom),
        badge: asNonEmptyString(set.badge),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toTeamMembers = (
  value: unknown
): ComponentProps<typeof NailStudioTeamView>["members"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((member) => {
      if (!isRecord(member)) {
        return null;
      }
      const name = asNonEmptyString(member.name);
      if (!name) {
        return null;
      }
      const imageFileId = asNonEmptyString(member.imageFileId);
      return {
        name,
        role: asNonEmptyString(member.role),
        specialty: asNonEmptyString(member.specialty),
        bio: asNonEmptyString(member.bio),
        imageSrc: imageFileId ? buildPublicFileUrl(imageFileId) : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toTestimonials = (
  value: unknown
): ComponentProps<typeof NailStudioTestimonialsView>["items"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const quote = asNonEmptyString(item.quote);
      if (!quote) {
        return null;
      }
      return {
        quote,
        author: asNonEmptyString(item.author),
        rating: typeof item.rating === "number" ? item.rating : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toBookingSteps = (
  value: unknown
): ComponentProps<typeof NailStudioBookingStepsView>["steps"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const title = asNonEmptyString(item.title);
      if (!title) {
        return null;
      }
      return {
        title,
        description: asNonEmptyString(item.description),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toLocationHours = (
  value: unknown
): ComponentProps<typeof NailStudioLocationHoursView>["hours"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const day = asNonEmptyString(item.day);
      const open = asNonEmptyString(item.open);
      const close = asNonEmptyString(item.close);
      if (!day || !open || !close) {
        return null;
      }
      return { day, open, close };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toFaqItems = (value: unknown): ComponentProps<typeof NailStudioFaqView>["items"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const question = asNonEmptyString(item.question);
      const answer = asNonEmptyString(item.answer);
      if (!question || !answer) {
        return null;
      }
      return { question, answer };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const toFooterLinks = (
  value: unknown
): ComponentProps<typeof NailStudioFooterView>["links"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const label = asNonEmptyString(item.label);
      const href = asNonEmptyString(item.href);
      if (!label || !href) {
        return null;
      }
      return { label, href };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};
