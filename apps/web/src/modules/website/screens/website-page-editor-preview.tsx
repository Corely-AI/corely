import React from "react";
import type { WebsiteBlock } from "@corely/contracts";
import { renderNailStudioBlockPreview } from "./website-page-editor-preview-nail";
import { renderTutoringBlockPreview } from "./website-page-editor-preview-tutoring";

export const renderWebsitePageBlockPreview = (
  selectedBlock: WebsiteBlock | null,
  templateKey?: string
): React.ReactNode => {
  const normalizedTemplate = templateKey?.trim();
  const isTutoringTemplate =
    normalizedTemplate === "landing.tutoring.v1" ||
    normalizedTemplate === "landing.deutschliebe.v1";

  if (isTutoringTemplate) {
    return (
      renderTutoringBlockPreview(selectedBlock) ?? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          Component preview is not available for this block type.
        </div>
      )
    );
  }

  return (
    renderNailStudioBlockPreview(selectedBlock) ?? (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        Component preview is not available for this block type.
      </div>
    )
  );
};
