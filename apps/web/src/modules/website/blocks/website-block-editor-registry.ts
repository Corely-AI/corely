import {
  WEBSITE_BLOCK_TYPES,
  type WebsiteBlock,
  type WebsiteBlockType,
  type WebsitePageContent,
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
} from "@corely/contracts";

export type WebsiteBlockEditorField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "boolean";
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
    fields: [
      { key: "navLabel", label: "Nav Label", type: "text" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      ...commonFields(),
    ],
  }),
  hero: createDefinition({
    type: "hero",
    displayName: "Hero",
    description: "Hero section",
    schema: WebsiteHeroBlockSchema,
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "subheadline", label: "Subheadline", type: "textarea" },
      { key: "primaryCtaLabel", label: "Primary CTA Label", type: "text" },
      { key: "primaryCtaHref", label: "Primary CTA Link", type: "text" },
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
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
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
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...commonFields()],
  }),
  leadForm: createDefinition({
    type: "leadForm",
    displayName: "Lead Form",
    description: "Lead form section",
    schema: WebsiteLeadFormBlockSchema,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "formId", label: "Form ID", type: "text" },
      { key: "submitLabel", label: "Submit Label", type: "text" },
      ...commonFields(),
    ],
  }),
  footer: createDefinition({
    type: "footer",
    displayName: "Footer",
    description: "Footer block",
    schema: WebsiteFooterBlockSchema,
    fields: [{ key: "copyrightText", label: "Copyright", type: "text" }, ...commonFields()],
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
    allowedBlockTypes: [...WEBSITE_BLOCK_TYPES],
    defaultContent: () => ({
      templateKey: "landing.tutoring.v1",
      templateVersion: "1",
      blocks: defaultBlocksForLandingTutoring(),
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
  fallback(): WebsiteTemplateEditorDefinition {
    return templateDefinitions["landing.tutoring.v1"];
  },
};
