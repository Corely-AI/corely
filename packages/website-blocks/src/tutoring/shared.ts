import { type BaseSectionProps, sectionClass } from "../shared/layout";

export type TutoringSectionProps = BaseSectionProps;

export type TutoringMenuItem = {
  label: string;
  href: string;
};

export type TutoringSocialLinks = {
  facebook?: string;
  instagram?: string;
  youtube?: string;
};

export type TutoringMethodStep = {
  title: string;
  description: string;
};

export type TutoringHighlightItem = {
  title: string;
  description: string;
};

export type TutoringCombo = {
  title: string;
  subtitle: string;
  sessions: string;
  suitableFor: string;
  outcomes: string[];
  highlight?: boolean;
};

export type TutoringBeforeAfterItem = {
  context: string;
  before: string;
  after: string;
};

export type TutoringFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type TutoringStickyNavViewProps = TutoringSectionProps & {
  siteTitle: string;
  homeHref: string;
  logoSrc?: string;
  navItems: TutoringMenuItem[];
  ctaLabel: string;
  ctaHref: string;
};

export type TutoringHeroViewProps = TutoringSectionProps & {
  badgeLabel: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  heroImageSrc?: string;
  heroImageAlt?: string;
};

export type TutoringSocialProofViewProps = TutoringSectionProps & {
  heading: string;
  chips: string[];
  socials: TutoringSocialLinks;
};

export type TutoringPasViewProps = TutoringSectionProps & {
  heading: string;
  problem: string;
  agitation: string;
  solution: string;
  summary: string;
  ctaLabel: string;
  ctaHref: string;
};

export type TutoringMethodViewProps = TutoringSectionProps & {
  heading: string;
  subheading: string;
  steps: TutoringMethodStep[];
};

export type TutoringProgramHighlightsViewProps = TutoringSectionProps & {
  heading: string;
  subheading: string;
  items: TutoringHighlightItem[];
  quote: string;
  quoteAuthor: string;
};

export type TutoringGroupLearningViewProps = TutoringSectionProps & {
  heading: string;
  summary: string;
  communityPoints: string[];
  reasons: string[];
  labels: string[];
  closingHeading: string;
  closingBody: string;
  ctaLabel: string;
  ctaHref: string;
  footerQuote: string;
};

export type TutoringCoursePackagesViewProps = TutoringSectionProps & {
  heading: string;
  subheading: string;
  combos: TutoringCombo[];
  ctaHref: string;
  ctaLabel: string;
};

export type TutoringScheduleViewProps = TutoringSectionProps & {
  heading: string;
  dateLabel: string;
  timeLabel: string;
  note: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
};

export type TutoringInstructorViewProps = TutoringSectionProps & {
  heading: string;
  name: string;
  bio: string;
  principles: string[];
};

export type TutoringTestimonialsViewProps = TutoringSectionProps & {
  heading: string;
  subheading: string;
  items: TutoringBeforeAfterItem[];
};

export type TutoringScholarshipViewProps = TutoringSectionProps & {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export type TutoringFaqViewProps = TutoringSectionProps & {
  heading: string;
  items: TutoringFaqItem[];
};

export type TutoringLeadFormViewProps = TutoringSectionProps & {
  heading: string;
  subheading: string;
  submitLabel: string;
  successHeading: string;
  successBody: string;
  successCtaLabel: string;
  successCtaHref: string;
  fallbackCtaLabel: string;
  fallbackCtaHref: string;
  packagesAnchorHref: string;
  consentLabel: string;
};

export type TutoringFooterViewProps = TutoringSectionProps & {
  siteTitle: string;
  logoSrc?: string;
  subtitle: string;
  socials: TutoringSocialLinks;
  copyrightText: string;
};

export { sectionClass };
