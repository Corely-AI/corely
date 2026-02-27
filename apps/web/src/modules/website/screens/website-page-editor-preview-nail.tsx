import React from "react";
import type { WebsiteBlock } from "@corely/contracts";
import {
  NailStudioBookingStepsView,
  NailStudioFaqView,
  NailStudioFooterView,
  NailStudioGalleryMasonryView,
  NailStudioHeroView,
  NailStudioLeadFormView,
  NailStudioLocationHoursView,
  NailStudioPriceMenuView,
  NailStudioServicesGridView,
  NailStudioSignatureSetsView,
  NailStudioStickyNavView,
  NailStudioTeamView,
  NailStudioTestimonialsView,
} from "@corely/website-blocks";
import { buildPublicFileUrl } from "@/lib/cms-api";
import { asNonEmptyString, asStringList } from "./website-page-editor.utils";
import {
  toBookingSteps,
  toFaqItems,
  toFooterLinks,
  toLocationHours,
  toPriceMenuCategories,
  toServiceItems,
  toSignatureSets,
  toTeamMembers,
  toTestimonials,
} from "./website-page-editor-preview-nail-mappers";

export const renderNailStudioBlockPreview = (
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

  if (selectedBlock.type === "servicesGrid") {
    const services = toServiceItems(props.items);
    return (
      <NailStudioServicesGridView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Services"}
        intro={asNonEmptyString(props.intro)}
        services={
          services.length > 0
            ? services
            : [
                { name: "Classic Manicure", duration: "45 min", priceFrom: "ab 39 EUR" },
                { name: "Gel Refill", duration: "75 min", priceFrom: "ab 59 EUR" },
              ]
        }
      />
    );
  }

  if (selectedBlock.type === "priceMenu") {
    const categories = toPriceMenuCategories(props.categories);
    return (
      <NailStudioPriceMenuView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Preis Menu"}
        intro={asNonEmptyString(props.intro)}
        categories={
          categories.length > 0
            ? categories
            : [
                {
                  title: "Manikure",
                  items: [{ name: "Classic", duration: "45 min", priceFrom: "ab 39 EUR" }],
                },
              ]
        }
      />
    );
  }

  if (selectedBlock.type === "galleryMasonry") {
    const imageUrls = asStringList(props.imageFileIds).map((fileId) => buildPublicFileUrl(fileId));
    return (
      <NailStudioGalleryMasonryView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Galerie"}
        intro={asNonEmptyString(props.intro)}
        imageUrls={imageUrls}
      />
    );
  }

  if (selectedBlock.type === "signatureSets") {
    const sets = toSignatureSets(props.sets);
    return (
      <NailStudioSignatureSetsView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Signature Sets"}
        intro={asNonEmptyString(props.intro)}
        sets={
          sets.length > 0
            ? sets
            : [{ name: "Berlin Glow Set", duration: "85 min", priceFrom: "ab 89 EUR" }]
        }
        ctaLabel={asNonEmptyString(props.ctaLabel) || "Jetzt buchen"}
        ctaHref={asNonEmptyString(props.ctaHref) || "#booking"}
      />
    );
  }

  if (selectedBlock.type === "team") {
    const members = toTeamMembers(props.members);
    return (
      <NailStudioTeamView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Unser Team"}
        intro={asNonEmptyString(props.intro)}
        members={
          members.length > 0
            ? members
            : [{ name: "Lina", role: "Senior Artist", specialty: "BIAB" }]
        }
      />
    );
  }

  if (selectedBlock.type === "testimonials") {
    const items = toTestimonials(props.items);
    return (
      <NailStudioTestimonialsView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Reviews"}
        items={
          items.length > 0 ? items : [{ quote: "Best BIAB in Berlin.", author: "Nina", rating: 5 }]
        }
      />
    );
  }

  if (selectedBlock.type === "bookingSteps") {
    const steps = toBookingSteps(props.steps);
    return (
      <NailStudioBookingStepsView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Booking in 3 steps"}
        intro={asNonEmptyString(props.intro)}
        steps={
          steps.length > 0
            ? steps
            : [
                { title: "Service waehlen" },
                { title: "Termin sichern" },
                { title: "Look geniessen" },
              ]
        }
        ctaLabel={asNonEmptyString(props.ctaLabel) || "Jetzt buchen"}
        ctaHref={asNonEmptyString(props.ctaHref) || "#booking"}
      />
    );
  }

  if (selectedBlock.type === "locationHours") {
    const hours = toLocationHours(props.hours);
    return (
      <NailStudioLocationHoursView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Location & Hours"}
        address={asNonEmptyString(props.address)}
        phone={asNonEmptyString(props.phone)}
        mapEmbedUrl={asNonEmptyString(props.mapEmbedUrl)}
        hours={hours.length > 0 ? hours : [{ day: "Mon", open: "10:00", close: "19:00" }]}
        policies={
          asStringList(props.policies).length > 0
            ? asStringList(props.policies)
            : ["Kostenlose Stornierung bis 24h vorher."]
        }
      />
    );
  }

  if (selectedBlock.type === "faq") {
    const items = toFaqItems(props.items);
    return (
      <NailStudioFaqView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "FAQ"}
        items={
          items.length > 0
            ? items
            : [{ question: "Wie lange halten Gel-Nails?", answer: "In der Regel 3-4 Wochen." }]
        }
      />
    );
  }

  if (selectedBlock.type === "leadForm") {
    return (
      <NailStudioLeadFormView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asNonEmptyString(props.heading) || "Book your appointment"}
        note={
          asNonEmptyString(props.note) ||
          "Tell us your preferred service and we will confirm your slot quickly."
        }
        formId={asNonEmptyString(props.formId)}
        submitLabel={asNonEmptyString(props.submitLabel) || "Request booking"}
      />
    );
  }

  if (selectedBlock.type === "footer") {
    const links = toFooterLinks(props.links);
    const year = new Date().getFullYear();
    return (
      <NailStudioFooterView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        siteTitle="Nail Atelier Berlin"
        siteSubtitle="Boutique nail studio in Berlin."
        copyrightText={
          asNonEmptyString(props.copyrightText) || `Copyright ${year} Nail Atelier Berlin`
        }
        links={links.length > 0 ? links : [{ label: "Services", href: "#services" }]}
      />
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
      Component preview is not available for this block type.
    </div>
  );
};
