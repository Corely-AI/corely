import React from "react";
import type { WebsiteFaqItem, WebsiteFooterLink, WebsiteLocationHour } from "@corely/contracts";
import { resolveInternalHref, sectionClass } from "./landing-tutoring-v1/components/shared";
import {
  type NailFaqProps,
  type NailFooterProps,
  type NailLeadFormProps,
  type NailLocationHoursProps,
  asStringList,
  commonSiteTitle,
  toFaqItems,
  toFooterLinks,
  toLocationHours,
} from "./landing-nailstudio-v1.shared";

const fallbackHours: WebsiteLocationHour[] = [
  { day: "Mon", open: "10:00", close: "19:00" },
  { day: "Tue", open: "10:00", close: "19:00" },
  { day: "Wed", open: "10:00", close: "19:00" },
  { day: "Thu", open: "10:00", close: "20:00" },
  { day: "Fri", open: "10:00", close: "20:00" },
  { day: "Sat", open: "10:00", close: "18:00" },
  { day: "Sun", open: "Closed", close: "Closed" },
];

const fallbackPolicies = [
  "Kostenlose Stornierung bis 24h vorher.",
  "Bei spaeteren Absagen wird 50% berechnet.",
  "Alle Tools werden nach EU-Standard sterilisiert.",
];

const fallbackFaq: WebsiteFaqItem[] = [
  { question: "Wie lange halten Gel-Nails?", answer: "In der Regel 3-4 Wochen." },
  {
    question: "Kann ich Nail Art kurzfristig hinzubuchen?",
    answer: "Ja, je nach Zeitfenster vor Ort.",
  },
  { question: "Nehmt ihr Walk-ins?", answer: "Nur bei freien Slots, Buchung wird empfohlen." },
];

const fallbackFooterLinks: WebsiteFooterLink[] = [
  { label: "Services", href: "#services" },
  { label: "Preise", href: "#preise" },
  { label: "Galerie", href: "#galerie" },
  { label: "Kontakt", href: "#kontakt" },
];

export const NailStudioLocationHours = (props: NailLocationHoursProps) => {
  const hours = toLocationHours(props.hours);
  const policies = asStringList(props.policies);

  return (
    <section id={props.anchorId ?? "kontakt"} className={sectionClass(props, "py-14 sm:py-16")}>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">
            {props.heading || "Location & Hours"}
          </h2>
          {props.address ? <p className="text-sm text-muted-foreground">{props.address}</p> : null}
          {props.phone ? (
            <p className="text-sm">
              <a
                href={`tel:${props.phone}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {props.phone}
              </a>
            </p>
          ) : null}

          <ul className="space-y-2 text-sm">
            {(hours.length ? hours : fallbackHours).map((item) => (
              <li
                key={item.day}
                className="flex items-center justify-between border-b border-border/50 pb-2 last:border-none"
              >
                <span>{item.day}</span>
                <span className="text-muted-foreground">
                  {item.open === "Closed" ? "Closed" : `${item.open} - ${item.close}`}
                </span>
              </li>
            ))}
          </ul>

          <ul className="space-y-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            {(policies.length ? policies : fallbackPolicies).map((policy) => (
              <li key={policy}>- {policy}</li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          {props.mapEmbedUrl ? (
            <iframe
              src={props.mapEmbedUrl}
              title="Studio map"
              loading="lazy"
              className="h-[420px] w-full"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
              Add mapEmbedUrl to display map.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const NailStudioFaq = (props: NailFaqProps) => {
  const items = toFaqItems(props.items);
  const list = items.length ? items : fallbackFaq;

  return (
    <section
      id={props.anchorId ?? "faq"}
      className={sectionClass(props, "border-y border-border/60 bg-[#fbf8f5] py-14 sm:py-16")}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "FAQ"}</h2>

        {list.map((item) => (
          <details
            key={item.question}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold">
              {item.question}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export const NailStudioLeadForm = (props: NailLeadFormProps) => (
  <section id={props.anchorId ?? "lead-form"} className={sectionClass(props, "py-14 sm:py-16")}>
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">
        {props.heading || "Book your appointment"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {props.note || "Tell us your preferred service and we will confirm your slot quickly."}
      </p>

      <form id={props.formId} className="mt-5 space-y-3">
        <input
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          placeholder="Name"
        />
        <input
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          placeholder="Phone or email"
        />
        <textarea
          className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          placeholder="Desired service and preferred time"
        />
        <button
          type="button"
          className="h-11 w-full rounded-xl bg-foreground text-sm font-semibold text-background"
        >
          {props.submitLabel || "Request booking"}
        </button>
      </form>
    </div>
  </section>
);

export const NailStudioFooter = (props: NailFooterProps) => {
  const links = toFooterLinks(props.links);
  const quickLinks = links.length ? links : fallbackFooterLinks;
  const socials = props.settings?.common?.socials;
  const year = new Date().getFullYear();

  return (
    <footer
      id={props.anchorId ?? "footer"}
      className={sectionClass(props, "border-t border-border/70 bg-[#f7f2ed] py-10")}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.14em]">
            {commonSiteTitle(props.settings)}
          </p>
          <p className="text-sm text-muted-foreground">
            {props.settings?.common?.siteSubtitle || "Boutique nail studio in Berlin."}
          </p>
          <p className="text-xs text-muted-foreground">
            {props.copyrightText || `Copyright ${year} ${commonSiteTitle(props.settings)}`}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            {quickLinks.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={resolveInternalHref(link.href, props.basePath)}
                className="underline-offset-4 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {socials?.instagram ? (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                Instagram
              </a>
            ) : null}
            {socials?.tiktok ? (
              <a
                href={socials.tiktok}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                TikTok
              </a>
            ) : null}
            {socials?.email ? <span>{socials.email}</span> : null}
          </div>
        </div>
      </div>
    </footer>
  );
};
