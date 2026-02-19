import React from "react";
import type { WebsiteBlock, WebsiteBlockType, WebsitePageContent } from "@corely/contracts";
import { WEBSITE_BLOCK_TYPES } from "@corely/contracts";
import { renderWebsiteBlock } from "../blocks/block-registry";

export type TemplateDefinition = {
  key: string;
  version: string;
  allowedBlockTypes: WebsiteBlockType[];
  render: (content: WebsitePageContent) => React.ReactNode;
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

const landingDeutschliebeTemplate: TemplateDefinition = {
  key: "landing.deutschliebe.v1",
  version: "1",
  allowedBlockTypes: [...WEBSITE_BLOCK_TYPES],
  defaultBlocks: defaultLandingBlocks,
  render: (content) => {
    const blocks = content.blocks.filter((block) => block.enabled !== false);
    return (
      <>
        {blocks.map((block) => (
          <React.Fragment key={block.id}>{renderWebsiteBlock(block)}</React.Fragment>
        ))}
      </>
    );
  },
};

const registry = new Map<string, TemplateDefinition>([
  [landingDeutschliebeTemplate.key, landingDeutschliebeTemplate],
]);

export const TemplateRegistry = {
  get(templateKey: string): TemplateDefinition | null {
    return registry.get(templateKey) ?? null;
  },
  all(): TemplateDefinition[] {
    return Array.from(registry.values());
  },
  fallback(): TemplateDefinition {
    return landingDeutschliebeTemplate;
  },
};
