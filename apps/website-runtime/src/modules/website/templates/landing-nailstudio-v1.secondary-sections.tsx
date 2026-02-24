import React from "react";
import type { WebsiteFaqItem, WebsiteFooterLink, WebsiteLocationHour } from "@corely/contracts";
import {
  NailStudioFaqView,
  NailStudioFooterView,
  NailStudioLeadFormView,
  NailStudioLocationHoursView,
} from "@corely/website-blocks";
import { resolveInternalHref } from "./template-runtime-shared";
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
    <NailStudioLocationHoursView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "Location & Hours"}
      address={props.address}
      phone={props.phone}
      mapEmbedUrl={props.mapEmbedUrl}
      hours={hours.length ? hours : fallbackHours}
      policies={policies.length ? policies : fallbackPolicies}
    />
  );
};

export const NailStudioFaq = (props: NailFaqProps) => {
  const items = toFaqItems(props.items);
  const list = items.length ? items : fallbackFaq;

  return (
    <NailStudioFaqView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading || "FAQ"}
      items={list}
    />
  );
};

export const NailStudioLeadForm = (props: NailLeadFormProps) => (
  <NailStudioLeadFormView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading || "Book your appointment"}
    note={props.note || "Tell us your preferred service and we will confirm your slot quickly."}
    formId={props.formId}
    submitLabel={props.submitLabel || "Request booking"}
  />
);

export const NailStudioFooter = (props: NailFooterProps) => {
  const links = toFooterLinks(props.links);
  const quickLinks = links.length ? links : fallbackFooterLinks;
  const socials = props.settings?.common?.socials;
  const year = new Date().getFullYear();

  return (
    <NailStudioFooterView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      siteTitle={commonSiteTitle(props.settings)}
      siteSubtitle={props.settings?.common?.siteSubtitle || "Boutique nail studio in Berlin."}
      copyrightText={props.copyrightText || `Copyright ${year} ${commonSiteTitle(props.settings)}`}
      links={quickLinks.map((link) => ({
        ...link,
        href: resolveInternalHref(link.href, props.basePath),
      }))}
      socials={{
        instagram: socials?.instagram,
        tiktok: socials?.tiktok,
        email: socials?.email,
      }}
    />
  );
};
