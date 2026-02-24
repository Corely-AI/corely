import React from "react";
import type {
  WebsiteBookingStep,
  WebsitePriceMenuCategory,
  WebsiteServiceItem,
  WebsiteSignatureSet,
  WebsiteTeamMember,
  WebsiteTestimonialItem,
} from "@corely/contracts";
import { NailStudioHeroView, NailStudioStickyNavView } from "@corely/website-blocks";
import { buildPublicFileUrl } from "@/lib/public-api";
import { resolveInternalHref, sectionClass } from "./landing-tutoring-v1/components/shared";
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
    <section id={props.anchorId ?? "services"} className={sectionClass(props, "py-14 sm:py-16")}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "Services"}</h2>
          {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={`${service.name}-${service.duration ?? ""}`}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold">{service.name}</h3>
                {service.priceFrom ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {service.priceFrom}
                  </span>
                ) : null}
              </div>
              {service.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
              ) : null}
              {service.duration ? (
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {service.duration}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export const NailStudioPriceMenu = (props: NailPriceMenuProps) => {
  const categories = toPriceMenuCategories(props.categories);
  const menu = categories.length ? categories : fallbackPriceMenu;

  return (
    <section
      id={props.anchorId ?? "preise"}
      className={sectionClass(props, "border-y border-border/60 bg-[#f9f6f2] py-14 sm:py-16")}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "Preis Menu"}</h2>
          {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {menu.map((category) => (
            <article
              key={category.title}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold">{category.title}</h3>
              <div className="mt-4 space-y-3">
                {category.items.map((item) => (
                  <div
                    key={`${item.name}-${item.priceFrom}`}
                    className="flex items-start justify-between gap-4 border-b border-border/50 pb-3 last:border-none last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.duration, item.note].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{item.priceFrom}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export const NailStudioGalleryMasonry = (props: NailGalleryMasonryProps) => {
  const imageFileIds = asStringList(props.imageFileIds);

  return (
    <section id={props.anchorId ?? "galerie"} className={sectionClass(props, "py-14 sm:py-16")}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "Galerie"}</h2>
          {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
        </div>

        <div className="columns-2 gap-4 space-y-4 md:columns-3">
          {imageFileIds.length > 0 ? (
            imageFileIds.map((fileId) => (
              <img
                key={fileId}
                src={buildPublicFileUrl(fileId)}
                alt="Nail gallery"
                className="w-full break-inside-avoid rounded-2xl border border-border/70 object-cover shadow-sm"
              />
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Add gallery images to display this section.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const NailStudioSignatureSets = (props: NailSignatureSetsProps) => {
  const sets = toSignatureSets(props.sets);
  const list = sets.length ? sets : fallbackSets;
  const ctaLabel = props.ctaLabel || "Jetzt buchen";
  const ctaHref = props.ctaHref || "#booking";

  return (
    <section
      id={props.anchorId ?? "signature-sets"}
      className={sectionClass(props, "py-14 sm:py-16")}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">
            {props.heading || "Signature Sets"}
          </h2>
          {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {list.map((set) => (
            <article
              key={set.name}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              {set.badge ? (
                <p className="mb-2 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium">
                  {set.badge}
                </p>
              ) : null}
              <h3 className="text-lg font-semibold">{set.name}</h3>
              {set.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{set.description}</p>
              ) : null}
              <p className="mt-4 text-sm font-medium text-foreground">
                {[set.duration, set.priceFrom].filter(Boolean).join(" - ")}
              </p>
            </article>
          ))}
        </div>

        <a
          href={resolveInternalHref(ctaHref, props.basePath)}
          className="inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
};

export const NailStudioTeam = (props: NailTeamProps) => {
  const members = toTeamMembers(props.members);
  const list = members.length ? members : fallbackTeam;

  return (
    <section
      id={props.anchorId ?? "team"}
      className={sectionClass(props, "border-y border-border/60 bg-[#faf7f3] py-14 sm:py-16")}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "Unser Team"}</h2>
          {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {list.map((member) => {
            const imageUrl = resolveFileUrl(member.imageFileId);
            return (
              <article
                key={member.name}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={member.name}
                    className="h-48 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                    Artist image
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {[member.role, member.specialty].filter(Boolean).join(" - ")}
                </p>
                {member.bio ? (
                  <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const NailStudioTestimonials = (props: NailTestimonialsProps) => {
  const testimonials = toTestimonials(props.items);
  const list = testimonials.length ? testimonials : fallbackTestimonials;

  return (
    <section
      id={props.anchorId ?? "testimonials"}
      className={sectionClass(props, "py-14 sm:py-16")}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "Reviews"}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {list.map((item, index) => (
            <blockquote
              key={`${item.quote}-${index}`}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">"{item.quote}"</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{item.author || "Guest"}</span>
                <span className="text-xs text-muted-foreground">
                  {"★".repeat(item.rating ?? 5)}
                </span>
              </div>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
};

export const NailStudioBookingSteps = (props: NailBookingStepsProps) => {
  const steps = toBookingSteps(props.steps);
  const list = steps.length ? steps : fallbackBookingSteps;
  const ctaLabel = props.ctaLabel || commonPrimaryCta(props.settings).label;
  const ctaHref = props.ctaHref || commonPrimaryCta(props.settings).href;

  return (
    <section
      id={props.anchorId ?? "booking"}
      className={sectionClass(props, "border-y border-border/60 bg-[#f8f4ef] py-14 sm:py-16")}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">
            {props.heading || "Booking in 3 steps"}
          </h2>
          {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {list.map((step, index) => (
            <article
              key={step.title}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Step {index + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              {step.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              ) : null}
            </article>
          ))}
        </div>

        <a
          href={resolveInternalHref(ctaHref, props.basePath)}
          className="inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
};
