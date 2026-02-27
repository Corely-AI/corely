import React from "react";
import {
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
  type WebsiteBlock,
  type WebsiteBlockType,
} from "@corely/contracts";
import {
  StickyNav,
  HeroSection,
  SocialProofStrip,
  PASSection,
  MethodSection,
  ProgramHighlights,
  GroupLearningSection,
  CoursePackages,
  ScheduleSection,
  InstructorSection,
  TestimonialsSection,
  ScholarshipSection,
  FAQSection,
  LeadForm,
  Footer,
} from "../templates/landing-tutoring-v1.sections";
import {
  NailStudioStickyNav,
  NailStudioHero,
  NailStudioTestimonials,
  NailStudioFaq,
  NailStudioLeadForm,
  NailStudioFooter,
} from "../templates/landing-nailstudio-v1.sections";
import type { WebsiteRenderContext } from "../runtime.types";
import { nailStudioBlockRegistry } from "./block-registry-nailstudio";
import {
  createDefinition,
  isNailStudioTemplate,
  toComponentProps,
  toSectionCommonFields,
  type BlockDefinition,
} from "./block-registry.shared";

const registry: Record<WebsiteBlockType, BlockDefinition> = {
  stickyNav: createDefinition({
    type: "stickyNav",
    schema: WebsiteStickyNavBlockSchema,
    label: "Sticky Nav",
    description: "Top sticky navigation section",
    renderer: ({ block, context }) => {
      if (isNailStudioTemplate(context)) {
        return (
          <NailStudioStickyNav
            {...toComponentProps<React.ComponentProps<typeof NailStudioStickyNav>>(block.props)}
            menus={context?.menus}
            settings={context?.settings}
            host={context?.host}
            basePath={context?.basePath}
          />
        );
      }

      return (
        <StickyNav
          {...toComponentProps<React.ComponentProps<typeof StickyNav>>(block.props)}
          menus={context?.menus}
          settings={context?.settings}
          host={context?.host}
          basePath={context?.basePath}
        />
      );
    },
    fields: [
      { key: "navLabel", label: "Nav Label", type: "text" },
      { key: "ctaLabel", label: "CTA Label", type: "text" },
      { key: "ctaHref", label: "CTA Link", type: "text" },
      { key: "logoFileId", label: "Logo fileId", type: "fileId" },
      ...toSectionCommonFields(),
    ],
  }),
  hero: createDefinition({
    type: "hero",
    schema: WebsiteHeroBlockSchema,
    label: "Hero",
    description: "Top hero section",
    renderer: ({ block, context }) => {
      if (isNailStudioTemplate(context)) {
        return (
          <NailStudioHero
            {...toComponentProps<React.ComponentProps<typeof NailStudioHero>>(block.props)}
            menus={context?.menus}
            settings={context?.settings}
            host={context?.host}
            basePath={context?.basePath}
          />
        );
      }

      return (
        <HeroSection
          {...toComponentProps<React.ComponentProps<typeof HeroSection>>(block.props)}
          menus={context?.menus}
          settings={context?.settings}
          host={context?.host}
          basePath={context?.basePath}
        />
      );
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
      ...toSectionCommonFields(),
    ],
  }),
  socialProof: createDefinition({
    type: "socialProof",
    schema: WebsiteSocialProofBlockSchema,
    label: "Social Proof",
    description: "Credibility strip",
    renderer: ({ block, context }) => (
      <SocialProofStrip
        {...toComponentProps<React.ComponentProps<typeof SocialProofStrip>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  pas: createDefinition({
    type: "pas",
    schema: WebsitePasBlockSchema,
    label: "PAS",
    description: "Problem-agitation-solution section",
    renderer: ({ block, context }) => (
      <PASSection
        {...toComponentProps<React.ComponentProps<typeof PASSection>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [
      { key: "problem", label: "Problem", type: "textarea" },
      { key: "agitation", label: "Agitation", type: "textarea" },
      { key: "solution", label: "Solution", type: "textarea" },
      ...toSectionCommonFields(),
    ],
  }),
  method: createDefinition({
    type: "method",
    schema: WebsiteMethodBlockSchema,
    label: "Method",
    description: "Method section",
    renderer: ({ block, context }) => (
      <MethodSection
        {...toComponentProps<React.ComponentProps<typeof MethodSection>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  programHighlights: createDefinition({
    type: "programHighlights",
    schema: WebsiteProgramHighlightsBlockSchema,
    label: "Program Highlights",
    description: "Program feature highlights",
    renderer: ({ block, context }) => (
      <ProgramHighlights
        {...toComponentProps<React.ComponentProps<typeof ProgramHighlights>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  groupLearning: createDefinition({
    type: "groupLearning",
    schema: WebsiteGroupLearningBlockSchema,
    label: "Group Learning",
    description: "Group-based learning section",
    renderer: ({ block, context }) => (
      <GroupLearningSection
        {...toComponentProps<React.ComponentProps<typeof GroupLearningSection>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  coursePackages: createDefinition({
    type: "coursePackages",
    schema: WebsiteCoursePackagesBlockSchema,
    label: "Course Packages",
    description: "Pricing/package options",
    renderer: ({ block, context }) => (
      <CoursePackages
        {...toComponentProps<React.ComponentProps<typeof CoursePackages>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  schedule: createDefinition({
    type: "schedule",
    schema: WebsiteScheduleBlockSchema,
    label: "Schedule",
    description: "Schedule and dates",
    renderer: ({ block, context }) => (
      <ScheduleSection
        {...toComponentProps<React.ComponentProps<typeof ScheduleSection>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  instructor: createDefinition({
    type: "instructor",
    schema: WebsiteInstructorBlockSchema,
    label: "Instructor",
    description: "Instructor profile",
    renderer: ({ block, context }) => (
      <InstructorSection
        {...toComponentProps<React.ComponentProps<typeof InstructorSection>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  testimonials: createDefinition({
    type: "testimonials",
    schema: WebsiteTestimonialsBlockSchema,
    label: "Testimonials",
    description: "Testimonials section",
    renderer: ({ block, context }) => {
      if (isNailStudioTemplate(context)) {
        return (
          <NailStudioTestimonials
            {...toComponentProps<React.ComponentProps<typeof NailStudioTestimonials>>(block.props)}
            menus={context?.menus}
            settings={context?.settings}
            host={context?.host}
            basePath={context?.basePath}
          />
        );
      }

      return (
        <TestimonialsSection
          {...toComponentProps<React.ComponentProps<typeof TestimonialsSection>>(block.props)}
          menus={context?.menus}
          settings={context?.settings}
          host={context?.host}
          basePath={context?.basePath}
        />
      );
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "items", label: "Items (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
  scholarship: createDefinition({
    type: "scholarship",
    schema: WebsiteScholarshipBlockSchema,
    label: "Scholarship",
    description: "Scholarship section",
    renderer: ({ block, context }) => (
      <ScholarshipSection
        {...toComponentProps<React.ComponentProps<typeof ScholarshipSection>>(block.props)}
        menus={context?.menus}
        settings={context?.settings}
        host={context?.host}
        basePath={context?.basePath}
      />
    ),
    fields: [{ key: "heading", label: "Heading", type: "text" }, ...toSectionCommonFields()],
  }),
  faq: createDefinition({
    type: "faq",
    schema: WebsiteFaqBlockSchema,
    label: "FAQ",
    description: "Frequently asked questions",
    renderer: ({ block, context }) => {
      if (isNailStudioTemplate(context)) {
        return (
          <NailStudioFaq
            {...toComponentProps<React.ComponentProps<typeof NailStudioFaq>>(block.props)}
            menus={context?.menus}
            settings={context?.settings}
            host={context?.host}
            basePath={context?.basePath}
          />
        );
      }

      return (
        <FAQSection
          {...toComponentProps<React.ComponentProps<typeof FAQSection>>(block.props)}
          menus={context?.menus}
          settings={context?.settings}
          host={context?.host}
          basePath={context?.basePath}
        />
      );
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "items", label: "Items (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
  leadForm: createDefinition({
    type: "leadForm",
    schema: WebsiteLeadFormBlockSchema,
    label: "Lead Form",
    description: "Lead capture form",
    renderer: ({ block, context }) => {
      if (isNailStudioTemplate(context)) {
        return (
          <NailStudioLeadForm
            {...toComponentProps<React.ComponentProps<typeof NailStudioLeadForm>>(block.props)}
            menus={context?.menus}
            settings={context?.settings}
            host={context?.host}
            basePath={context?.basePath}
          />
        );
      }

      return (
        <LeadForm
          {...toComponentProps<React.ComponentProps<typeof LeadForm>>(block.props)}
          menus={context?.menus}
          settings={context?.settings}
          host={context?.host}
          basePath={context?.basePath}
        />
      );
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "formId", label: "Form ID", type: "text" },
      { key: "submitLabel", label: "Submit Label", type: "text" },
      { key: "note", label: "Note", type: "textarea" },
      ...toSectionCommonFields(),
    ],
  }),
  footer: createDefinition({
    type: "footer",
    schema: WebsiteFooterBlockSchema,
    label: "Footer",
    description: "Footer section",
    renderer: ({ block, context }) => {
      if (isNailStudioTemplate(context)) {
        return (
          <NailStudioFooter
            {...toComponentProps<React.ComponentProps<typeof NailStudioFooter>>(block.props)}
            menus={context?.menus}
            settings={context?.settings}
            host={context?.host}
            basePath={context?.basePath}
          />
        );
      }

      return (
        <Footer
          {...toComponentProps<React.ComponentProps<typeof Footer>>(block.props)}
          menus={context?.menus}
          settings={context?.settings}
          host={context?.host}
          basePath={context?.basePath}
        />
      );
    },
    fields: [
      { key: "copyrightText", label: "Copyright", type: "text" },
      { key: "links", label: "Footer Links (JSON)", type: "json" },
      ...toSectionCommonFields(),
    ],
  }),
  ...nailStudioBlockRegistry,
};

export const BlockRegistry = {
  get(type: WebsiteBlockType) {
    return registry[type];
  },
  all() {
    return Object.values(registry);
  },
};

const renderInvalidBlockPlaceholder = (block: WebsiteBlock, reason: string) => (
  <div className="mx-auto my-4 w-full max-w-6xl rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
    {`Invalid block "${block.type}" (${reason}).`}
  </div>
);

export const renderWebsiteBlock = (
  block: WebsiteBlock,
  options?: { previewMode?: boolean; context?: WebsiteRenderContext }
): React.ReactNode => {
  const definition = registry[block.type];
  if (!definition) {
    return options?.previewMode
      ? renderInvalidBlockPlaceholder(block, "type not registered")
      : null;
  }

  const parsed = definition.schema.safeParse(block);
  if (!parsed.success) {
    return options?.previewMode
      ? renderInvalidBlockPlaceholder(block, "schema validation failed")
      : null;
  }

  const Component = definition.renderer;
  return <Component block={parsed.data} context={options?.context} />;
};
