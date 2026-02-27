import React from "react";
import {
  type ResolveWebsitePublicOutput,
  type WebsitePageContent,
  WebsitePageContentSchema,
} from "@corely/contracts";
import { PublicSiteLayout } from "@/components/website/public-site-layout";
import { TemplateDefault } from "@/components/website/template-default";
import { renderWebsiteBlock } from "@/modules/website/blocks/block-registry";
import { TemplateRegistry } from "@/modules/website/templates/template-registry";

export const WebsitePublicPageScreen = ({
  page,
  host,
  previewMode,
  basePath,
}: {
  page: ResolveWebsitePublicOutput;
  host?: string | null;
  previewMode?: boolean;
  basePath?: string;
}) => {
  const parsedLegacyContent = WebsitePageContentSchema.safeParse(page.payloadJson);
  const content: WebsitePageContent =
    page.page?.content ??
    (parsedLegacyContent.success
      ? parsedLegacyContent.data
      : {
          templateKey: page.template,
          blocks: [],
        });
  const templateDefinition = TemplateRegistry.get(content.templateKey);
  const activeBlocks = content.blocks.filter((block) => block.enabled !== false);
  const templateRender = templateDefinition ? (
    templateDefinition.render(content, {
      previewMode,
      context: {
        settings: page.settings,
        menus: page.menus,
        host,
        basePath,
      },
    })
  ) : activeBlocks.length > 0 ? (
    <>
      {activeBlocks.map((block) => (
        <React.Fragment key={block.id}>
          {renderWebsiteBlock(block, {
            previewMode,
            context: {
              settings: page.settings,
              menus: page.menus,
              host,
              basePath,
            },
          })}
        </React.Fragment>
      ))}
    </>
  ) : (
    <TemplateDefault payload={page.page?.content ?? page.payloadJson} />
  );

  return (
    <PublicSiteLayout
      menus={page.menus}
      settings={page.settings}
      host={host}
      previewMode={previewMode}
      basePath={basePath}
    >
      {templateRender}
    </PublicSiteLayout>
  );
};
