import React from "react";
import type { WebsiteBlock, WebsiteBlockType, WebsitePageContent } from "@corely/contracts";
import { renderWebsiteBlock } from "../blocks/block-registry";
import type { WebsiteRenderContext } from "../runtime.types";
import { LandingNailStudioV1Template } from "./landing-nailstudio-v1-template";

export type TemplateDefinition = {
  key: string;
  version: string;
  allowedBlockTypes: WebsiteBlockType[];
  render: (
    content: WebsitePageContent,
    options?: { previewMode?: boolean; context?: WebsiteRenderContext }
  ) => React.ReactNode;
  defaultBlocks: () => WebsiteBlock[];
};

const defaultLandingBlocks = (): WebsiteBlock[] => [
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

const defaultNailStudioBlocks = (): WebsiteBlock[] => [
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

const landingTutoringTemplate: TemplateDefinition = {
  key: "landing.tutoring.v1",
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
  defaultBlocks: defaultLandingBlocks,
  render: (content, options) => {
    const blocks = content.blocks.filter((block) => block.enabled !== false);
    return (
      <>
        {blocks.map((block) => (
          <React.Fragment key={block.id}>
            {renderWebsiteBlock(block, {
              previewMode: options?.previewMode,
              context: {
                ...options?.context,
                templateKey: content.templateKey,
              },
            })}
          </React.Fragment>
        ))}
      </>
    );
  },
};

const landingNailStudioTemplate: TemplateDefinition = {
  key: "landing.nailstudio.v1",
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
  defaultBlocks: defaultNailStudioBlocks,
  render: (content, options) => (
    <LandingNailStudioV1Template
      content={content}
      previewMode={options?.previewMode}
      context={options?.context}
    />
  ),
};

const legacyTemplateAliases = ["landing.deutschliebe.v1"] as const;

const registry = new Map<string, TemplateDefinition>([
  [landingTutoringTemplate.key, landingTutoringTemplate],
  [landingNailStudioTemplate.key, landingNailStudioTemplate],
  ...legacyTemplateAliases.map((key) => [key, landingTutoringTemplate] as const),
]);

export const TemplateRegistry = {
  get(templateKey: string): TemplateDefinition | null {
    return registry.get(templateKey) ?? null;
  },
  all(): TemplateDefinition[] {
    return Array.from(registry.values());
  },
  fallback(): TemplateDefinition {
    return landingTutoringTemplate;
  },
};
