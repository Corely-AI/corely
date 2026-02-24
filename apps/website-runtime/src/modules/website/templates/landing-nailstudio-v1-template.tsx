import React from "react";
import type { WebsitePageContent } from "@corely/contracts";
import { renderWebsiteBlock } from "../blocks/block-registry";
import type { WebsiteRenderContext } from "../runtime.types";
import { resolveInternalHref } from "./landing-tutoring-v1/components/shared";

export const LandingNailStudioV1Template = ({
  content,
  previewMode,
  context,
}: {
  content: WebsitePageContent;
  previewMode?: boolean;
  context?: WebsiteRenderContext;
}) => {
  const blocks = content.blocks.filter((block) => block.enabled !== false);
  const bookingHref = resolveInternalHref("#booking", context?.basePath);

  return (
    <>
      {blocks.map((block) => (
        <React.Fragment key={block.id}>
          {renderWebsiteBlock(block, {
            previewMode,
            context: {
              ...context,
              templateKey: content.templateKey,
            },
          })}
        </React.Fragment>
      ))}

      <a
        href={bookingHref}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-lg transition hover:opacity-90 md:bottom-6 md:right-6"
      >
        Jetzt buchen
      </a>
    </>
  );
};
