import React from "react";
import type {
  WebsiteBookingStep,
  WebsitePriceMenuCategory,
  WebsiteServiceItem,
  WebsiteSignatureSet,
  WebsiteTeamMember,
  WebsiteTestimonialItem,
} from "@corely/contracts";
import {
  NailStudioBookingStepsView,
  NailStudioGalleryMasonryView,
  NailStudioHeroView,
  NailStudioPriceMenuView,
  NailStudioServicesGridView,
  NailStudioSignatureSetsView,
  NailStudioStickyNavView,
  NailStudioTeamView,
  NailStudioTestimonialsView,
} from "@corely/website-blocks";
import { buildPublicFileUrl } from "@/lib/public-api";
import { resolveInternalHref } from "./template-runtime-shared";
import {
  type NailBookingStepsProps,
  type NailGalleryMasonryProps,
  type NailHeroProps,
  type NailPriceMenuProps,
  type NailServicesGridProps,
  type NailSignatureSetsProps,
  type NailStickyNavProps,
  type NailTeamProps,
  type NailTestimonialsProps,
  asStringList,
  commonPrimaryCta,
  commonSiteTitle,
  resolveFileUrl,
  resolveNavItems,
  toBookingSteps,
  toPriceMenuCategories,
  toServiceItems,
  toSignatureSets,
  toTeamMembers,
  toTestimonials,
} from "./landing-nailstudio-v1.shared";

const fallbackServices: WebsiteServiceItem[] = [
  { name: "Classic Manicure", duration: "45 min", priceFrom: "ab 39 EUR" },
  { name: "Gel Refill", duration: "75 min", priceFrom: "ab 59 EUR" },
  { name: "BIAB Overlay", duration: "70 min", priceFrom: "ab 65 EUR" },
  { name: "Nail Art", duration: "20-40 min", priceFrom: "ab 12 EUR" },
  { name: "Spa Pedicure", duration: "55 min", priceFrom: "ab 49 EUR" },
  { name: "Repair & Rescue", duration: "15 min", priceFrom: "ab 8 EUR" },
];

const fallbackPriceMenu: WebsitePriceMenuCategory[] = [
  {
    title: "Manikure",
    items: [
      { name: "Classic", duration: "45 min", priceFrom: "ab 39 EUR" },
      { name: "Russian", duration: "60 min", priceFrom: "ab 49 EUR" },
    ],
  },
  {
    title: "Gel & BIAB",
    items: [
      { name: "Gel New Set", duration: "90 min", priceFrom: "ab 79 EUR" },
      { name: "BIAB Overlay", duration: "70 min", priceFrom: "ab 65 EUR" },
      { name: "Refill", duration: "75 min", priceFrom: "ab 59 EUR" },
    ],
  },
];

const fallbackSets: WebsiteSignatureSet[] = [
  {
    name: "Berlin Glow Set",
    description: "Soft almond shape with pearl chrome finish.",
    duration: "85 min",
    priceFrom: "ab 89 EUR",
  },
  {
    name: "Minimal French",
    description: "Micro french with translucent pink base.",
    duration: "80 min",
    priceFrom: "ab 84 EUR",
  },
  {
    name: "Editorial Nail Art",
    description: "Statement artwork tailored to your palette.",
    duration: "100 min",
    priceFrom: "ab 109 EUR",
    badge: "Most booked",
  },
];

const fallbackTeam: WebsiteTeamMember[] = [
  {
    name: "Lina",
    role: "Senior Artist",
    specialty: "BIAB, clean girl manicures",
    bio: "8+ years in editorial and salon services.",
  },
  {
    name: "Marta",
    role: "Nail Artist",
    specialty: "Nail art and sculpted gel",
    bio: "Precision shaping and hand-painted details.",
  },
  {
    name: "Sofia",
    role: "Pedicure Specialist",
    specialty: "Spa pedicure and foot care",
    bio: "Comfort-focused treatment with premium products.",
  },
];

const fallbackTestimonials: WebsiteTestimonialItem[] = [
  { quote: "Best BIAB in Berlin. Lasts for weeks.", author: "Nina" },
  { quote: "Quiet boutique vibe and perfect shaping.", author: "Carla" },
  { quote: "My go-to salon before every event.", author: "Mia" },
];

const fallbackBookingSteps: WebsiteBookingStep[] = [
  { title: "Service waehlen", description: "Pick manicure, gel, BIAB or pedicure." },
  { title: "Termin sichern", description: "Choose date and artist in under 1 minute." },
  { title: "Look geniessen", description: "Arrive, relax, and leave photo-ready." },
];

const fallbackHeroHighlights = ["Sterile tools", "Premium gels", "Berlin Mitte"];

export const NailStudioStickyNav = (props: NailStickyNavProps) => {
  const navItems = resolveNavItems(props.menus).map((item) => ({
    ...item,
    href: resolveInternalHref(item.href, props.basePath),
  }));
  const cta = {
    label: props.ctaLabel || commonPrimaryCta(props.settings).label,
    href: props.ctaHref || commonPrimaryCta(props.settings).href,
  };
  const logoSrc = resolveFileUrl(props.logoFileId || props.settings?.common?.logo?.fileId);
  const siteTitle = props.navLabel || commonSiteTitle(props.settings);

  return (
    <NailStudioStickyNavView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      homeHref={resolveInternalHref("/", props.basePath)}
      logoSrc={logoSrc}
      siteTitle={siteTitle}
      navItems={navItems}
      ctaLabel={cta.label}
      ctaHref={resolveInternalHref(cta.href, props.basePath)}
    />
  );
};

export const NailStudioHero = (props: NailHeroProps) => {
  const cta = {
    label: props.primaryCtaLabel || commonPrimaryCta(props.settings).label,
    href: props.primaryCtaHref || commonPrimaryCta(props.settings).href,
  };
  const secondaryLabel = props.secondaryCtaLabel || "Preise ansehen";
  const secondaryHref = props.secondaryCtaHref || "#preise";
  const highlights = asStringList(props.highlights).length
    ? asStringList(props.highlights)
    : fallbackHeroHighlights;
  const imageSrc = resolveFileUrl(props.heroImageFileId);

  return (
    <NailStudioHeroView
      anchorId={props.anchorId ?? "hero"}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      eyebrow={props.eyebrow || "Boutique Nail Studio"}
      headline={props.headline || "Soft luxury nails in Berlin"}
      subheadline={
        props.subheadline ||
        "Book modern manicures, BIAB and signature sets crafted with clean technique, premium products and a calm salon atmosphere."
      }
      primaryCtaLabel={cta.label}
      primaryCtaHref={resolveInternalHref(cta.href, props.basePath)}
      secondaryCtaLabel={secondaryLabel}
      secondaryCtaHref={resolveInternalHref(secondaryHref, props.basePath)}
      highlights={highlights}
      imageSrc={imageSrc}
    />
  );
};

export const NailStudioServicesGrid = (props: NailServicesGridProps) => {
  const items = toServiceItems(props.items);
  const services = items.length ? items : fallbackServices;

  return (
    <NailStudioServicesGridView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Services"}
      intro={props.intro}
      services={services}
    />
  );
};

export const NailStudioPriceMenu = (props: NailPriceMenuProps) => {
  const categories = toPriceMenuCategories(props.categories);
  const menu = categories.length ? categories : fallbackPriceMenu;

  return (
    <NailStudioPriceMenuView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Preis Menu"}
      intro={props.intro}
      categories={menu}
    />
  );
};

export const NailStudioGalleryMasonry = (props: NailGalleryMasonryProps) => {
  const imageFileIds = asStringList(props.imageFileIds);
  const imageUrls = imageFileIds.map((fileId) => buildPublicFileUrl(fileId));

  return (
    <NailStudioGalleryMasonryView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Galerie"}
      intro={props.intro}
      imageUrls={imageUrls}
    />
  );
};

export const NailStudioSignatureSets = (props: NailSignatureSetsProps) => {
  const sets = toSignatureSets(props.sets);
  const list = sets.length ? sets : fallbackSets;
  const ctaLabel = props.ctaLabel || "Jetzt buchen";
  const ctaHref = props.ctaHref || "#booking";

  return (
    <NailStudioSignatureSetsView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Signature Sets"}
      intro={props.intro}
      sets={list}
      ctaLabel={ctaLabel}
      ctaHref={resolveInternalHref(ctaHref, props.basePath)}
    />
  );
};

export const NailStudioTeam = (props: NailTeamProps) => {
  const members = toTeamMembers(props.members);
  const list = (members.length ? members : fallbackTeam).map((member) => ({
    ...member,
    imageSrc: resolveFileUrl(member.imageFileId),
  }));

  return (
    <NailStudioTeamView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Unser Team"}
      intro={props.intro}
      members={list}
    />
  );
};

export const NailStudioTestimonials = (props: NailTestimonialsProps) => {
  const testimonials = toTestimonials(props.items);
  const list = testimonials.length ? testimonials : fallbackTestimonials;

  return (
    <NailStudioTestimonialsView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Reviews"}
      items={list}
    />
  );
};

export const NailStudioBookingSteps = (props: NailBookingStepsProps) => {
  const steps = toBookingSteps(props.steps);
  const list = steps.length ? steps : fallbackBookingSteps;
  const ctaLabel = props.ctaLabel || commonPrimaryCta(props.settings).label;
  const ctaHref = props.ctaHref || commonPrimaryCta(props.settings).href;

  return (
    <NailStudioBookingStepsView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Booking in 3 steps"}
      intro={props.intro}
      steps={list}
      ctaLabel={ctaLabel}
      ctaHref={resolveInternalHref(ctaHref, props.basePath)}
    />
  );
};
