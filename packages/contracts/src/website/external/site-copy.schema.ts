import { z } from "zod";

const MAX_JSON_DEPTH = 20;
const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isJsonSafeValue = (value: unknown, depth = 0): boolean => {
  if (depth > MAX_JSON_DEPTH) {
    return false;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonSafeValue(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      return false;
    }
    if (!isJsonSafeValue(nested, depth + 1)) {
      return false;
    }
  }

  return true;
};

export const SiteCopySchema = z
  .object({
    nav: z.unknown().optional(),
    hero: z.unknown().optional(),
    painPoints: z.unknown().optional(),
    features: z.unknown().optional(),
    kassenbuchHighlight: z.unknown().optional(),
    howItWorks: z.unknown().optional(),
    websiteOffer: z.unknown().optional(),
    pricing: z.unknown().optional(),
    faq: z.unknown().optional(),
    finalCta: z.unknown().optional(),
    footer: z.unknown().optional(),
    testimonials: z.unknown().optional(),
    pages: z.unknown().optional(),
    ui: z.unknown().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!isJsonSafeValue(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Site copy content must be JSON-serializable.",
      });
    }
  });

export type SiteCopy = z.infer<typeof SiteCopySchema>;
