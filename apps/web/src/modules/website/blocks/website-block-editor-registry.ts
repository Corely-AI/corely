import {
  type WebsiteBlock,
  type WebsiteBlockType,
  type WebsitePageContent,
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
} from "@corely/contracts";

export type WebsiteBlockEditorField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "json" | "fileId" | "fileIdList";
};

export type WebsiteBlockEditorDefinition = {
  type: WebsiteBlockType;
  displayName: string;
  description: string;
  schema: {
    safeParse: (value: unknown) => { success: true; data: WebsiteBlock } | { success: false };
  };
  defaultProps: Record<string, unknown>;
  fields: WebsiteBlockEditorField[];
};

const commonFields = (): WebsiteBlockEditorField[] => [
  { key: "anchorId", label: "Anchor ID", type: "text" },
  { key: "className", label: "Class Name", type: "text" },
  { key: "variant", label: "Variant", type: "text" },
  { key: "hiddenOn.mobile", label: "Hide on mobile", type: "boolean" },
  { key: "hiddenOn.desktop", label: "Hide on desktop", type: "boolean" },
];

const createDefinition = (input: {
  type: WebsiteBlockType;
  displayName: string;
  description: string;
  schema: WebsiteBlockEditorDefinition["schema"];
  defaultProps?: Record<string, unknown>;
  fields?: WebsiteBlockEditorField[];
}): WebsiteBlockEditorDefinition => ({
  type: input.type,
  displayName: input.displayName,
  description: input.description,
  schema: input.schema,
  defaultProps: input.defaultProps ?? {},
  fields: input.fields ?? commonFields(),
});

const definitions: Record<WebsiteBlockType, WebsiteBlockEditorDefinition> = {
  stickyNav: createDefinition({
    type: "stickyNav",
    displayName: "Sticky Nav",
    description: "Top sticky navigation",
    schema: WebsiteStickyNavBlockSchema,
    defaultProps: {
      navLabel: "Nail Atelier",
      ctaLabel: "Jetzt buchen",
      ctaHref: "#booking",
    },
    fields: [
      { key: "navLabel", label: "Nav Label", type: "text" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      { key: "logoFileId", label: "Logo fileId", type: "fileId" },
      ...commonFields(),
    ],
  }),
  hero: createDefinition({
    type: "hero",
    displayName: "Hero",
    description: "Hero section",
    schema: WebsiteHeroBlockSchema,
    defaultProps: {
      eyebrow: "Boutique Nail Studio",
      headline: "Soft luxury nails in Berlin",
      subheadline: "Moderne Manikure, BIAB und Nail Art - buchungsfreundlich und praezise.",
      primaryCtaLabel: "Termin buchen",
      primaryCtaHref: "#booking",
      secondaryCtaLabel: "Preise ansehen",
      secondaryCtaHref: "#preise",
      highlights: ["Sterile tools", "Premium gels", "Berlin Mitte"],
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "subheadline", label: "Subheadline", type: "textarea" },
      { key: "primaryCtaLabel", label: "Primary CTA Label", type: "text" },
      { key: "primaryCtaHref", label: "Primary CTA Link", type: "text" },
      { key: "secondaryCtaLabel", label: "Secondary CTA Label", type: "text" },
      { key: "secondaryCtaHref", label: "Secondary CTA Link", type: "text" },
      { key: "heroImageFileId", label: "Hero image fileId", type: "fileId" },
      { key: "highlights", label: "Highlights (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  servicesGrid: createDefinition({
    type: "servicesGrid",
    displayName: "Services Grid",
    description: "Grid of services",
    schema: WebsiteServicesGridBlockSchema,
    defaultProps: {
      heading: "Services",
      intro: "Beliebte Treatments fuer Alltag, Events und Editorial Looks.",
      items: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "items", label: "Services (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  priceMenu: createDefinition({
    type: "priceMenu",
    displayName: "Price Menu",
    description: "Categories and prices",
    schema: WebsitePriceMenuBlockSchema,
    defaultProps: {
      heading: "Preis Menu",
      intro: "Transparente Preise mit Dauer pro Behandlung.",
      categories: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "categories", label: "Categories (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  galleryMasonry: createDefinition({
    type: "galleryMasonry",
    displayName: "Gallery Masonry",
    description: "Masonry gallery",
    schema: WebsiteGalleryMasonryBlockSchema,
    defaultProps: {
      heading: "Galerie",
      intro: "Aktuelle Arbeiten aus dem Studio.",
      imageFileIds: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "imageFileIds", label: "Image fileIds", type: "fileIdList" },
      ...commonFields(),
    ],
  }),
  signatureSets: createDefinition({
    type: "signatureSets",
    displayName: "Signature Sets",
    description: "Highlight signature looks",
    schema: WebsiteSignatureSetsBlockSchema,
    defaultProps: {
      heading: "Signature Sets",
      intro: "Kuratiert fuer besondere Looks.",
      sets: [],
      ctaLabel: "Jetzt buchen",
      ctaHref: "#booking",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "sets", label: "Sets (JSON)", type: "json" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      ...commonFields(),
    ],
  }),
  team: createDefinition({
    type: "team",
    displayName: "Team",
    description: "Artists and specialties",
    schema: WebsiteTeamBlockSchema,
    defaultProps: {
      heading: "Unser Team",
      intro: "Lerne unsere Artists kennen.",
      members: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "members", label: "Members (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  socialProof: createDefinition({
    type: "socialProof",
    displayName: "Social Proof",
    description: "Social proof strip",
    schema: WebsiteSocialProofBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  pas: createDefinition({
    type: "pas",
    displayName: "PAS",
    description: "Problem, Agitation, Solution",
    schema: WebsitePasBlockSchema,
    fields: [
      { key: "problem", label: "Problem", type: "textarea" },
      { key: "agitation", label: "Agitation", type: "textarea" },
      { key: "solution", label: "Solution", type: "textarea" },
      ...commonFields(),
    ],
  }),
  method: createDefinition({
    type: "method",
    displayName: "Method",
    description: "Method section",
    schema: WebsiteMethodBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  programHighlights: createDefinition({
    type: "programHighlights",
    displayName: "Program Highlights",
    description: "Program highlights section",
    schema: WebsiteProgramHighlightsBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  groupLearning: createDefinition({
    type: "groupLearning",
    displayName: "Group Learning",
    description: "Group learning section",
    schema: WebsiteGroupLearningBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  coursePackages: createDefinition({
    type: "coursePackages",
    displayName: "Course Packages",
    description: "Course packages section",
    schema: WebsiteCoursePackagesBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  schedule: createDefinition({
    type: "schedule",
    displayName: "Schedule",
    description: "Schedule section",
    schema: WebsiteScheduleBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  instructor: createDefinition({
    type: "instructor",
    displayName: "Instructor",
    description: "Instructor section",
    schema: WebsiteInstructorBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  testimonials: createDefinition({
    type: "testimonials",
    displayName: "Testimonials",
    description: "Testimonials section",
    schema: WebsiteTestimonialsBlockSchema,
    defaultProps: {
      heading: "Reviews",
      items: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "items", label: "Items (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  bookingSteps: createDefinition({
    type: "bookingSteps",
    displayName: "Booking Steps",
    description: "How users book",
    schema: WebsiteBookingStepsBlockSchema,
    defaultProps: {
      heading: "Booking in 3 Schritten",
      intro: "In wenigen Klicks zu deinem Termin.",
      steps: [],
      ctaLabel: "Termin sichern",
      ctaHref: "#booking",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "steps", label: "Steps (JSON)", type: "json" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      ...commonFields(),
    ],
  }),
  locationHours: createDefinition({
    type: "locationHours",
    displayName: "Location & Hours",
    description: "Address, hours and map",
    schema: WebsiteLocationHoursBlockSchema,
    defaultProps: {
      heading: "Location & Hours",
      hours: [],
      policies: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "mapEmbedUrl", label: "Map URL", type: "text" },
      { key: "hours", label: "Hours (JSON)", type: "json" },
      { key: "policies", label: "Policies (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  scholarship: createDefinition({
    type: "scholarship",
    displayName: "Scholarship",
    description: "Scholarship section",
    schema: WebsiteScholarshipBlockSchema,
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  faq: createDefinition({
    type: "faq",
    displayName: "FAQ",
    description: "FAQ section",
    schema: WebsiteFaqBlockSchema,
    defaultProps: {
      heading: "FAQ",
      items: [],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "items", label: "Items (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
  leadForm: createDefinition({
    type: "leadForm",
    displayName: "Lead Form",
    description: "Lead form section",
    schema: WebsiteLeadFormBlockSchema,
    defaultProps: {
      heading: "Buche deinen Termin",
      submitLabel: "Anfrage senden",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "formId", label: "Form ID", type: "text" },
      { key: "submitLabel", label: "Submit Label", type: "text" },
      { key: "note", label: "Note", type: "textarea" },
      ...commonFields(),
    ],
  }),
  footer: createDefinition({
    type: "footer",
    displayName: "Footer",
    description: "Footer block",
    schema: WebsiteFooterBlockSchema,
    defaultProps: {
      links: [],
    },
    fields: [
      { key: "copyrightText", label: "Copyright", type: "text" },
      { key: "links", label: "Links (JSON)", type: "json" },
      ...commonFields(),
    ],
  }),
};

const defaultBlocksForLandingTutoring = (): WebsiteBlock[] => [
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

const defaultBlocksForLandingNailStudio = (): WebsiteBlock[] => [
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

export type WebsiteTemplateEditorDefinition = {
  templateKey: string;
  version: string;
  allowedBlockTypes: WebsiteBlockType[];
  defaultContent: () => WebsitePageContent;
};

const templateDefinitions: Record<string, WebsiteTemplateEditorDefinition> = {
  "landing.tutoring.v1": {
    templateKey: "landing.tutoring.v1",
    version: "1",
    allowedBlockTypes: [
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
    ],
    defaultContent: () => ({
      templateKey: "landing.tutoring.v1",
      templateVersion: "1",
      blocks: defaultBlocksForLandingTutoring(),
    }),
  },
  "landing.nailstudio.v1": {
    templateKey: "landing.nailstudio.v1",
    version: "1",
    allowedBlockTypes: [
      "stickyNav",
      "hero",
      "servicesGrid",
      "priceMenu",
      "galleryMasonry",
      "signatureSets",
      "team",
      "testimonials",
      "bookingSteps",
      "locationHours",
      "faq",
      "leadForm",
      "footer",
    ],
    defaultContent: () => ({
      templateKey: "landing.nailstudio.v1",
      templateVersion: "1",
      blocks: defaultBlocksForLandingNailStudio(),
    }),
  },
};

export const WebsiteBlockEditorRegistry = {
  get(type: WebsiteBlockType): WebsiteBlockEditorDefinition {
    return definitions[type];
  },
  all(): WebsiteBlockEditorDefinition[] {
    return Object.values(definitions);
  },
};

export const WebsiteTemplateEditorRegistry = {
  get(templateKey: string): WebsiteTemplateEditorDefinition | null {
    return templateDefinitions[templateKey] ?? null;
  },
  all(): WebsiteTemplateEditorDefinition[] {
    return Object.values(templateDefinitions);
  },
  fallback(): WebsiteTemplateEditorDefinition {
    return templateDefinitions["landing.tutoring.v1"];
  },
};
