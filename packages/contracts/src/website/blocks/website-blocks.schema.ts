import { z } from "zod";

export const WebsiteBlockVersionSchema = z.union([
  z.number().int().nonnegative(),
  z.string().min(1),
]);

export const WebsiteBlockHiddenOnSchema = z
  .object({
    mobile: z.boolean().optional(),
    desktop: z.boolean().optional(),
  })
  .strict();
export type WebsiteBlockHiddenOn = z.infer<typeof WebsiteBlockHiddenOnSchema>;

export const WebsiteBlockVariantSchema = z.enum(["default", "compact", "highlight", "minimal"]);

export const WebsiteBlockCommonPropsSchema = z
  .object({
    anchorId: z.string().min(1).max(120).optional(),
    className: z.string().min(1).max(240).optional(),
    variant: WebsiteBlockVariantSchema.optional(),
    hiddenOn: WebsiteBlockHiddenOnSchema.optional(),
  })
  .strict();

export const WebsiteBlockBaseSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    enabled: z.boolean().default(true),
    version: WebsiteBlockVersionSchema.optional(),
    props: z.record(z.unknown()),
  })
  .strict();
export type WebsiteBlockBase = z.infer<typeof WebsiteBlockBaseSchema>;

const createBlockPropsSchema = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z
    .object({
      ...WebsiteBlockCommonPropsSchema.shape,
      ...shape,
    })
    .strict();

const WebsiteStringListSchema = z.array(z.string().min(1).max(240)).max(40);
const WebsiteImageFileIdsSchema = z.array(z.string().min(1).max(120)).max(40);

const WebsiteServiceItemSchema = z
  .object({
    name: z.string().min(1).max(140),
    description: z.string().min(1).max(320).optional(),
    duration: z.string().min(1).max(80).optional(),
    priceFrom: z.string().min(1).max(80).optional(),
    imageFileId: z.string().min(1).max(120).optional(),
  })
  .strict();
export type WebsiteServiceItem = z.infer<typeof WebsiteServiceItemSchema>;

const WebsitePriceMenuItemSchema = z
  .object({
    name: z.string().min(1).max(140),
    duration: z.string().min(1).max(80).optional(),
    priceFrom: z.string().min(1).max(80),
    note: z.string().min(1).max(200).optional(),
  })
  .strict();
export type WebsitePriceMenuItem = z.infer<typeof WebsitePriceMenuItemSchema>;

const WebsitePriceMenuCategorySchema = z
  .object({
    title: z.string().min(1).max(140),
    items: z.array(WebsitePriceMenuItemSchema).max(30).default([]),
  })
  .strict();
export type WebsitePriceMenuCategory = z.infer<typeof WebsitePriceMenuCategorySchema>;

const WebsiteSignatureSetSchema = z
  .object({
    name: z.string().min(1).max(140),
    description: z.string().min(1).max(320).optional(),
    priceFrom: z.string().min(1).max(80).optional(),
    duration: z.string().min(1).max(80).optional(),
    badge: z.string().min(1).max(80).optional(),
  })
  .strict();
export type WebsiteSignatureSet = z.infer<typeof WebsiteSignatureSetSchema>;

const WebsiteTeamMemberSchema = z
  .object({
    name: z.string().min(1).max(140),
    role: z.string().min(1).max(140).optional(),
    specialty: z.string().min(1).max(180).optional(),
    bio: z.string().min(1).max(500).optional(),
    imageFileId: z.string().min(1).max(120).optional(),
  })
  .strict();
export type WebsiteTeamMember = z.infer<typeof WebsiteTeamMemberSchema>;

const WebsiteTestimonialItemSchema = z
  .object({
    quote: z.string().min(1).max(500),
    author: z.string().min(1).max(140).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  })
  .strict();
export type WebsiteTestimonialItem = z.infer<typeof WebsiteTestimonialItemSchema>;

const WebsiteBookingStepSchema = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(320).optional(),
  })
  .strict();
export type WebsiteBookingStep = z.infer<typeof WebsiteBookingStepSchema>;

const WebsiteLocationHourSchema = z
  .object({
    day: z.string().min(1).max(80),
    open: z.string().min(1).max(40),
    close: z.string().min(1).max(40),
  })
  .strict();
export type WebsiteLocationHour = z.infer<typeof WebsiteLocationHourSchema>;

const WebsiteFaqItemSchema = z
  .object({
    question: z.string().min(1).max(240),
    answer: z.string().min(1).max(1200),
  })
  .strict();
export type WebsiteFaqItem = z.infer<typeof WebsiteFaqItemSchema>;

const WebsiteFooterLinkSchema = z
  .object({
    label: z.string().min(1).max(120),
    href: z.string().min(1).max(2048),
  })
  .strict();
export type WebsiteFooterLink = z.infer<typeof WebsiteFooterLinkSchema>;

export const WebsiteStickyNavBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("stickyNav"),
  props: createBlockPropsSchema({
    navLabel: z.string().min(1).max(120).optional(),
    ctaLabel: z.string().min(1).max(120).optional(),
    ctaHref: z.string().min(1).max(2048).optional(),
    logoFileId: z.string().min(1).max(120).optional(),
  }).default({}),
});
export type WebsiteStickyNavBlock = z.infer<typeof WebsiteStickyNavBlockSchema>;

export const WebsiteHeroBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("hero"),
  props: createBlockPropsSchema({
    eyebrow: z.string().min(1).max(140).optional(),
    headline: z.string().min(1).max(240).optional(),
    subheadline: z.string().min(1).max(500).optional(),
    primaryCtaLabel: z.string().min(1).max(120).optional(),
    primaryCtaHref: z.string().min(1).max(2048).optional(),
    secondaryCtaLabel: z.string().min(1).max(120).optional(),
    secondaryCtaHref: z.string().min(1).max(2048).optional(),
    heroImageFileId: z.string().min(1).max(120).optional(),
    highlights: WebsiteStringListSchema.optional(),
  }).default({}),
});
export type WebsiteHeroBlock = z.infer<typeof WebsiteHeroBlockSchema>;

export const WebsiteServicesGridBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("servicesGrid"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    intro: z.string().min(1).max(500).optional(),
    items: z.array(WebsiteServiceItemSchema).max(40).optional(),
  }).default({}),
});
export type WebsiteServicesGridBlock = z.infer<typeof WebsiteServicesGridBlockSchema>;

export const WebsitePriceMenuBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("priceMenu"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    intro: z.string().min(1).max(500).optional(),
    categories: z.array(WebsitePriceMenuCategorySchema).max(20).optional(),
  }).default({}),
});
export type WebsitePriceMenuBlock = z.infer<typeof WebsitePriceMenuBlockSchema>;

export const WebsiteGalleryMasonryBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("galleryMasonry"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    intro: z.string().min(1).max(500).optional(),
    imageFileIds: WebsiteImageFileIdsSchema.optional(),
  }).default({}),
});
export type WebsiteGalleryMasonryBlock = z.infer<typeof WebsiteGalleryMasonryBlockSchema>;

export const WebsiteSignatureSetsBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("signatureSets"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    intro: z.string().min(1).max(500).optional(),
    sets: z.array(WebsiteSignatureSetSchema).max(24).optional(),
    ctaLabel: z.string().min(1).max(120).optional(),
    ctaHref: z.string().min(1).max(2048).optional(),
  }).default({}),
});
export type WebsiteSignatureSetsBlock = z.infer<typeof WebsiteSignatureSetsBlockSchema>;

export const WebsiteTeamBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("team"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    intro: z.string().min(1).max(500).optional(),
    members: z.array(WebsiteTeamMemberSchema).max(20).optional(),
  }).default({}),
});
export type WebsiteTeamBlock = z.infer<typeof WebsiteTeamBlockSchema>;

export const WebsiteSocialProofBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("socialProof"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsitePasBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("pas"),
  props: createBlockPropsSchema({
    problem: z.string().max(1000).optional(),
    agitation: z.string().max(1000).optional(),
    solution: z.string().max(1000).optional(),
  }).default({}),
});

export const WebsiteMethodBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("method"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteProgramHighlightsBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("programHighlights"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteGroupLearningBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("groupLearning"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteCoursePackagesBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("coursePackages"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteScheduleBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("schedule"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteInstructorBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("instructor"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteTestimonialsBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("testimonials"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    items: z.array(WebsiteTestimonialItemSchema).max(24).optional(),
  }).default({}),
});
export type WebsiteTestimonialsBlock = z.infer<typeof WebsiteTestimonialsBlockSchema>;

export const WebsiteBookingStepsBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("bookingSteps"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    intro: z.string().min(1).max(500).optional(),
    steps: z.array(WebsiteBookingStepSchema).max(20).optional(),
    ctaLabel: z.string().min(1).max(120).optional(),
    ctaHref: z.string().min(1).max(2048).optional(),
  }).default({}),
});
export type WebsiteBookingStepsBlock = z.infer<typeof WebsiteBookingStepsBlockSchema>;

export const WebsiteLocationHoursBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("locationHours"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    address: z.string().min(1).max(240).optional(),
    phone: z.string().min(1).max(80).optional(),
    mapEmbedUrl: z.string().min(1).max(2048).optional(),
    hours: z.array(WebsiteLocationHourSchema).max(20).optional(),
    policies: WebsiteStringListSchema.optional(),
  }).default({}),
});
export type WebsiteLocationHoursBlock = z.infer<typeof WebsiteLocationHoursBlockSchema>;

export const WebsiteScholarshipBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("scholarship"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
  }).default({}),
});

export const WebsiteFaqBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("faq"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    items: z.array(WebsiteFaqItemSchema).max(30).optional(),
  }).default({}),
});
export type WebsiteFaqBlock = z.infer<typeof WebsiteFaqBlockSchema>;

export const WebsiteLeadFormBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("leadForm"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    formId: z.string().min(1).max(120).optional(),
    submitLabel: z.string().min(1).max(120).optional(),
    note: z.string().min(1).max(280).optional(),
  }).default({}),
});
export type WebsiteLeadFormBlock = z.infer<typeof WebsiteLeadFormBlockSchema>;

export const WebsiteFooterBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("footer"),
  props: createBlockPropsSchema({
    copyrightText: z.string().max(280).optional(),
    links: z.array(WebsiteFooterLinkSchema).max(20).optional(),
  }).default({}),
});
export type WebsiteFooterBlock = z.infer<typeof WebsiteFooterBlockSchema>;

export const WebsiteBlockUnionSchema = z.discriminatedUnion("type", [
  WebsiteStickyNavBlockSchema,
  WebsiteHeroBlockSchema,
  WebsiteServicesGridBlockSchema,
  WebsitePriceMenuBlockSchema,
  WebsiteGalleryMasonryBlockSchema,
  WebsiteSignatureSetsBlockSchema,
  WebsiteTeamBlockSchema,
  WebsiteSocialProofBlockSchema,
  WebsitePasBlockSchema,
  WebsiteMethodBlockSchema,
  WebsiteProgramHighlightsBlockSchema,
  WebsiteGroupLearningBlockSchema,
  WebsiteCoursePackagesBlockSchema,
  WebsiteScheduleBlockSchema,
  WebsiteInstructorBlockSchema,
  WebsiteTestimonialsBlockSchema,
  WebsiteBookingStepsBlockSchema,
  WebsiteLocationHoursBlockSchema,
  WebsiteScholarshipBlockSchema,
  WebsiteFaqBlockSchema,
  WebsiteLeadFormBlockSchema,
  WebsiteFooterBlockSchema,
]);
export type WebsiteBlock = z.infer<typeof WebsiteBlockUnionSchema>;

export const WEBSITE_BLOCK_TYPES = [
  "stickyNav",
  "hero",
  "servicesGrid",
  "priceMenu",
  "galleryMasonry",
  "signatureSets",
  "team",
  "socialProof",
  "pas",
  "method",
  "programHighlights",
  "groupLearning",
  "coursePackages",
  "schedule",
  "instructor",
  "testimonials",
  "bookingSteps",
  "locationHours",
  "scholarship",
  "faq",
  "leadForm",
  "footer",
] as const;
export type WebsiteBlockType = (typeof WEBSITE_BLOCK_TYPES)[number];
export const WebsiteBlockTypeSchema = z.enum(WEBSITE_BLOCK_TYPES);

export const WEBSITE_TEMPLATE_KEYS = ["landing.tutoring.v1", "landing.nailstudio.v1"] as const;
export type WebsiteTemplateKey = (typeof WEBSITE_TEMPLATE_KEYS)[number];
export const WebsiteTemplateKeySchema = z.enum(WEBSITE_TEMPLATE_KEYS);

export const WebsiteSeoOverrideSchema = z
  .object({
    title: z.string().max(160).optional().nullable(),
    description: z.string().max(320).optional().nullable(),
    imageFileId: z.string().optional().nullable(),
    ogTitle: z.string().max(160).optional().nullable(),
    ogDescription: z.string().max(320).optional().nullable(),
    ogImageFileId: z.string().optional().nullable(),
  })
  .strict();

export const WebsitePageContentSchema = z
  .object({
    templateKey: z.string().min(1),
    templateVersion: z.string().min(1).optional(),
    blocks: z.array(WebsiteBlockUnionSchema).default([]),
    seoOverride: WebsiteSeoOverrideSchema.optional(),
  })
  .strict();
export type WebsitePageContent = z.infer<typeof WebsitePageContentSchema>;
