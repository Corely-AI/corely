import { type BaseSectionProps, sectionClass } from "../shared/layout";

export type NailStudioMenuItem = {
  label: string;
  href: string;
};

export type NailStudioSectionProps = BaseSectionProps;

export type NailStudioServiceItem = {
  name: string;
  description?: string;
  duration?: string;
  priceFrom?: string;
};

export type NailStudioPriceMenuEntry = {
  name: string;
  priceFrom: string;
  duration?: string;
  note?: string;
};

export type NailStudioPriceMenuCategory = {
  title: string;
  items: NailStudioPriceMenuEntry[];
};

export type NailStudioSignatureSet = {
  name: string;
  description?: string;
  duration?: string;
  priceFrom?: string;
  badge?: string;
};

export type NailStudioTeamMember = {
  name: string;
  role?: string;
  specialty?: string;
  bio?: string;
  imageSrc?: string;
};

export type NailStudioTestimonialItem = {
  quote: string;
  author?: string;
  rating?: number;
};

export type NailStudioBookingStep = {
  title: string;
  description?: string;
};

export type NailStudioLocationHour = {
  day: string;
  open: string;
  close: string;
};

export type NailStudioFaqItem = {
  question: string;
  answer: string;
};

export type NailStudioFooterLink = {
  label: string;
  href: string;
};

export type NailStudioFooterSocials = {
  instagram?: string;
  tiktok?: string;
  email?: string;
};

export type NailStudioStickyNavViewProps = NailStudioSectionProps & {
  siteTitle: string;
  homeHref?: string;
  logoSrc?: string;
  navItems: NailStudioMenuItem[];
  ctaLabel: string;
  ctaHref: string;
  sticky?: boolean;
};

export type NailStudioHeroViewProps = NailStudioSectionProps & {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  highlights: string[];
  imageSrc?: string;
};

export type NailStudioServicesGridViewProps = NailStudioSectionProps & {
  heading: string;
  intro?: string;
  services: NailStudioServiceItem[];
};

export type NailStudioPriceMenuViewProps = NailStudioSectionProps & {
  heading: string;
  intro?: string;
  categories: NailStudioPriceMenuCategory[];
};

export type NailStudioGalleryMasonryViewProps = NailStudioSectionProps & {
  heading: string;
  intro?: string;
  imageUrls: string[];
  emptyStateLabel?: string;
};

export type NailStudioSignatureSetsViewProps = NailStudioSectionProps & {
  heading: string;
  intro?: string;
  sets: NailStudioSignatureSet[];
  ctaLabel: string;
  ctaHref: string;
};

export type NailStudioTeamViewProps = NailStudioSectionProps & {
  heading: string;
  intro?: string;
  members: NailStudioTeamMember[];
};

export type NailStudioTestimonialsViewProps = NailStudioSectionProps & {
  heading: string;
  items: NailStudioTestimonialItem[];
};

export type NailStudioBookingStepsViewProps = NailStudioSectionProps & {
  heading: string;
  intro?: string;
  steps: NailStudioBookingStep[];
  ctaLabel: string;
  ctaHref: string;
};

export type NailStudioLocationHoursViewProps = NailStudioSectionProps & {
  heading: string;
  address?: string;
  phone?: string;
  mapEmbedUrl?: string;
  hours: NailStudioLocationHour[];
  policies: string[];
};

export type NailStudioFaqViewProps = NailStudioSectionProps & {
  heading: string;
  items: NailStudioFaqItem[];
};

export type NailStudioLeadFormViewProps = NailStudioSectionProps & {
  heading: string;
  note: string;
  formId?: string;
  submitLabel: string;
  namePlaceholder?: string;
  contactPlaceholder?: string;
  requestPlaceholder?: string;
};

export type NailStudioFooterViewProps = NailStudioSectionProps & {
  siteTitle: string;
  siteSubtitle?: string;
  copyrightText: string;
  links: NailStudioFooterLink[];
  socials?: NailStudioFooterSocials;
};

export { sectionClass };
