import {
  WEBSITE_TEMPLATE_KEYS,
  WebsitePageContentSchema,
  type WebsiteBlock,
  type WebsitePageContent,
} from "@corely/contracts";

const DEFAULT_TEMPLATE_KEY = WEBSITE_TEMPLATE_KEYS[0];
const NAIL_STUDIO_TEMPLATE_KEY = "landing.nailstudio.v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createDefaultBlocksForLandingTutoring = (): WebsiteBlock[] => [
  { id: "sticky-nav", type: "stickyNav", enabled: true, props: {} },
  { id: "hero", type: "hero", enabled: true, props: {} },
  { id: "social-proof", type: "socialProof", enabled: true, props: {} },
  { id: "pas", type: "pas", enabled: true, props: {} },
  { id: "method", type: "method", enabled: true, props: {} },
  { id: "program-highlights", type: "programHighlights", enabled: true, props: {} },
  { id: "group-learning", type: "groupLearning", enabled: true, props: {} },
  { id: "course-packages", type: "coursePackages", enabled: true, props: {} },
  { id: "schedule", type: "schedule", enabled: true, props: {} },
  { id: "instructor", type: "instructor", enabled: true, props: {} },
  { id: "testimonials", type: "testimonials", enabled: true, props: {} },
  { id: "scholarship", type: "scholarship", enabled: true, props: {} },
  { id: "faq", type: "faq", enabled: true, props: {} },
  { id: "lead-form", type: "leadForm", enabled: true, props: {} },
  { id: "footer", type: "footer", enabled: true, props: {} },
];

const createDefaultBlocksForLandingNailStudio = (): WebsiteBlock[] => [
  { id: "sticky-nav", type: "stickyNav", enabled: true, props: {} },
  { id: "hero", type: "hero", enabled: true, props: {} },
  { id: "services-grid", type: "servicesGrid", enabled: true, props: {} },
  { id: "price-menu", type: "priceMenu", enabled: true, props: {} },
  { id: "gallery-masonry", type: "galleryMasonry", enabled: true, props: {} },
  { id: "signature-sets", type: "signatureSets", enabled: true, props: {} },
  { id: "team", type: "team", enabled: true, props: {} },
  { id: "testimonials", type: "testimonials", enabled: true, props: {} },
  { id: "booking-steps", type: "bookingSteps", enabled: true, props: {} },
  { id: "location-hours", type: "locationHours", enabled: true, props: {} },
  { id: "faq", type: "faq", enabled: true, props: {} },
  { id: "lead-form", type: "leadForm", enabled: true, props: {} },
  { id: "footer", type: "footer", enabled: true, props: {} },
];

export const buildDefaultWebsitePageContent = (
  templateKey = DEFAULT_TEMPLATE_KEY
): WebsitePageContent => {
  if (templateKey === DEFAULT_TEMPLATE_KEY) {
    return {
      templateKey,
      templateVersion: "1",
      blocks: createDefaultBlocksForLandingTutoring(),
    };
  }

  if (templateKey === NAIL_STUDIO_TEMPLATE_KEY) {
    return {
      templateKey,
      templateVersion: "1",
      blocks: createDefaultBlocksForLandingNailStudio(),
    };
  }

  return {
    templateKey,
    blocks: [],
  };
};

export const normalizeWebsitePageContent = (
  input: unknown,
  templateKeyFallback = DEFAULT_TEMPLATE_KEY
): WebsitePageContent => {
  const direct = WebsitePageContentSchema.safeParse(input);
  if (direct.success) {
    return direct.data;
  }

  if (isRecord(input)) {
    const fromContentField = WebsitePageContentSchema.safeParse(input.content);
    if (fromContentField.success) {
      return fromContentField.data;
    }

    const fromContentJsonField = WebsitePageContentSchema.safeParse(input.contentJson);
    if (fromContentJsonField.success) {
      return fromContentJsonField.data;
    }

    const parsedFromLegacy = WebsitePageContentSchema.safeParse({
      templateKey:
        typeof input.templateKey === "string"
          ? input.templateKey
          : typeof input.template === "string"
            ? input.template
            : templateKeyFallback,
      templateVersion:
        typeof input.templateVersion === "string" ? input.templateVersion : undefined,
      blocks: Array.isArray(input.blocks) ? input.blocks : [],
      seoOverride: isRecord(input.seoOverride) ? input.seoOverride : undefined,
    });
    if (parsedFromLegacy.success) {
      return parsedFromLegacy.data;
    }
  }

  return buildDefaultWebsitePageContent(templateKeyFallback);
};

export const extractWebsitePageContentFromCmsPayload = (
  payload: unknown,
  templateKeyFallback = DEFAULT_TEMPLATE_KEY
): WebsitePageContent => {
  if (isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, "contentJson")) {
    return normalizeWebsitePageContent(payload.contentJson, templateKeyFallback);
  }

  return normalizeWebsitePageContent(payload, templateKeyFallback);
};
