import React from "react";
import type { WebsiteBlock } from "@corely/contracts";
import { NailStudioHeroView, NailStudioStickyNavView } from "@corely/website-blocks";
import { buildPublicFileUrl } from "@/lib/cms-api";
import { asNonEmptyString, asStringList } from "./website-page-editor.utils";

export const renderWebsitePageBlockPreview = (
  selectedBlock: WebsiteBlock | null
): React.ReactNode => {
  if (!selectedBlock) {
    return null;
  }

  const props =
    selectedBlock.props && typeof selectedBlock.props === "object"
      ? (selectedBlock.props as Record<string, unknown>)
      : {};

  if (selectedBlock.type === "stickyNav") {
    const logoFileId = asNonEmptyString(props.logoFileId);
    return (
      <NailStudioStickyNavView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        navItems={[
          { label: "Services", href: "#services" },
          { label: "Preise", href: "#preise" },
          { label: "Galerie", href: "#galerie" },
          { label: "Kontakt", href: "#kontakt" },
        ]}
        siteTitle={asNonEmptyString(props.navLabel) || "Nail Atelier Berlin"}
        ctaLabel={asNonEmptyString(props.ctaLabel) || "Jetzt buchen"}
        ctaHref={asNonEmptyString(props.ctaHref) || "#booking"}
        logoSrc={logoFileId ? buildPublicFileUrl(logoFileId) : undefined}
        sticky={false}
      />
    );
  }

  if (selectedBlock.type === "hero") {
    const heroImageFileId = asNonEmptyString(props.heroImageFileId);
    const highlights = asStringList(props.highlights);
    return (
      <NailStudioHeroView
        anchorId={asNonEmptyString(props.anchorId) || "hero"}
        className={asNonEmptyString(props.className)}
        eyebrow={asNonEmptyString(props.eyebrow) || "Boutique Nail Studio"}
        headline={asNonEmptyString(props.headline) || "Soft luxury nails in Berlin"}
        subheadline={
          asNonEmptyString(props.subheadline) ||
          "Book modern manicures, BIAB and signature sets crafted with clean technique."
        }
        primaryCtaLabel={asNonEmptyString(props.primaryCtaLabel) || "Jetzt buchen"}
        primaryCtaHref={asNonEmptyString(props.primaryCtaHref) || "#booking"}
        secondaryCtaLabel={asNonEmptyString(props.secondaryCtaLabel) || "Preise ansehen"}
        secondaryCtaHref={asNonEmptyString(props.secondaryCtaHref) || "#preise"}
        highlights={
          highlights.length > 0 ? highlights : ["Sterile tools", "Premium gels", "Berlin Mitte"]
        }
        imageSrc={heroImageFileId ? buildPublicFileUrl(heroImageFileId) : undefined}
      />
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
      Component preview is currently enabled for `stickyNav` and `hero`.
    </div>
  );
};
