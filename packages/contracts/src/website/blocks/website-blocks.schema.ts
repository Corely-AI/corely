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

export const WebsiteStickyNavBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("stickyNav"),
  props: createBlockPropsSchema({
    navLabel: z.string().min(1).max(120).optional(),
    ctaLabel: z.string().min(1).max(120).optional(),
    ctaHref: z.string().min(1).max(2048).optional(),
  }).default({}),
});

export const WebsiteHeroBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("hero"),
  props: createBlockPropsSchema({
    headline: z.string().min(1).max(240).optional(),
    subheadline: z.string().min(1).max(500).optional(),
    primaryCtaLabel: z.string().min(1).max(120).optional(),
    primaryCtaHref: z.string().min(1).max(2048).optional(),
  }).default({}),
});

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
  }).default({}),
});

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
  }).default({}),
});

export const WebsiteLeadFormBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("leadForm"),
  props: createBlockPropsSchema({
    heading: z.string().min(1).max(200).optional(),
    formId: z.string().min(1).max(120).optional(),
    submitLabel: z.string().min(1).max(120).optional(),
  }).default({}),
});

export const WebsiteFooterBlockSchema = WebsiteBlockBaseSchema.extend({
  type: z.literal("footer"),
  props: createBlockPropsSchema({
    copyrightText: z.string().max(280).optional(),
  }).default({}),
});

export const WebsiteBlockUnionSchema = z.discriminatedUnion("type", [
  WebsiteStickyNavBlockSchema,
  WebsiteHeroBlockSchema,
  WebsiteSocialProofBlockSchema,
  WebsitePasBlockSchema,
  WebsiteMethodBlockSchema,
  WebsiteProgramHighlightsBlockSchema,
  WebsiteGroupLearningBlockSchema,
  WebsiteCoursePackagesBlockSchema,
  WebsiteScheduleBlockSchema,
  WebsiteInstructorBlockSchema,
  WebsiteTestimonialsBlockSchema,
  WebsiteScholarshipBlockSchema,
  WebsiteFaqBlockSchema,
  WebsiteLeadFormBlockSchema,
  WebsiteFooterBlockSchema,
]);
export type WebsiteBlock = z.infer<typeof WebsiteBlockUnionSchema>;

export const WEBSITE_BLOCK_TYPES = [
  "stickyNav",
  "hero",
  "socialProof",
  "pas",
  "method",
  "programHighlights",
  "groupLearning",
  "coursePackages",
  "schedule",
  "instructor",
  "testimonials",
  "scholarship",
  "faq",
  "leadForm",
  "footer",
] as const;
export type WebsiteBlockType = (typeof WEBSITE_BLOCK_TYPES)[number];
export const WebsiteBlockTypeSchema = z.enum(WEBSITE_BLOCK_TYPES);

export const WebsiteSeoOverrideSchema = z
  .object({
    title: z.string().max(160).optional().nullable(),
    description: z.string().max(320).optional().nullable(),
    imageFileId: z.string().optional().nullable(),
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
