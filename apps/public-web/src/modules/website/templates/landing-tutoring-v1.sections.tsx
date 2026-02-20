import React from "react";
import type { WebsiteBlockHiddenOn } from "@corely/contracts";

const hiddenClass = (hiddenOn: WebsiteBlockHiddenOn | undefined): string => {
  if (hiddenOn?.mobile && hiddenOn?.desktop) {
    return "hidden";
  }
  if (hiddenOn?.mobile) {
    return "hidden md:block";
  }
  if (hiddenOn?.desktop) {
    return "md:hidden";
  }
  return "";
};

const sectionClass = (input: { className?: string; hiddenOn?: WebsiteBlockHiddenOn }): string =>
  ["mx-auto w-full max-w-6xl px-6 py-12", hiddenClass(input.hiddenOn), input.className]
    .filter(Boolean)
    .join(" ");

const SectionShell = ({
  id,
  title,
  subtitle,
  className,
  hiddenOn,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
}) => (
  <section id={id} className={sectionClass({ className, hiddenOn })}>
    <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-3 text-muted-foreground">{subtitle}</p> : null}
    </div>
  </section>
);

export const StickyNav = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  navLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) => (
  <section
    id={props.anchorId}
    className={sectionClass({ className: props.className, hiddenOn: props.hiddenOn })}
  >
    <div className="sticky top-16 z-20 rounded-xl border border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{props.navLabel ?? "DeutschLiebe"}</span>
        {props.ctaLabel && props.ctaHref ? (
          <a
            href={props.ctaHref}
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
          >
            {props.ctaLabel}
          </a>
        ) : null}
      </div>
    </div>
  </section>
);

export const HeroSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  headline?: string;
  subheadline?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
}) => (
  <section
    id={props.anchorId}
    className={sectionClass({ className: props.className, hiddenOn: props.hiddenOn })}
  >
    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-10">
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
        {props.headline ?? "Learn German with confidence"}
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
        {props.subheadline ??
          "Structured lessons, expert guidance, and a practical path to fluency."}
      </p>
      {props.primaryCtaLabel && props.primaryCtaHref ? (
        <a
          href={props.primaryCtaHref}
          className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground"
        >
          {props.primaryCtaLabel}
        </a>
      ) : null}
    </div>
  </section>
);

export const SocialProofStrip = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Trusted by learners across Europe"}
  />
);

export const PASSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  problem?: string;
  agitation?: string;
  solution?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title="Problem, Agitation, Solution"
    subtitle={
      [props.problem, props.agitation, props.solution].filter(Boolean).join(" ") || undefined
    }
  />
);

export const MethodSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Method"}
  />
);

export const ProgramHighlights = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Program Highlights"}
  />
);

export const GroupLearningSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Group Learning"}
  />
);

export const CoursePackages = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Course Packages"}
  />
);

export const ScheduleSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Schedule"}
  />
);

export const InstructorSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Instructor"}
  />
);

export const TestimonialsSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Testimonials"}
  />
);

export const ScholarshipSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "Scholarship"}
  />
);

export const FAQSection = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
}) => (
  <SectionShell
    id={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    title={props.heading ?? "FAQ"}
  />
);

export const LeadForm = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  heading?: string;
  submitLabel?: string;
}) => (
  <section
    id={props.anchorId}
    className={sectionClass({ className: props.className, hiddenOn: props.hiddenOn })}
  >
    <div className="rounded-2xl border border-border/60 bg-card p-8">
      <h2 className="text-2xl font-semibold tracking-tight">{props.heading ?? "Lead Form"}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <input
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Name"
        />
        <input
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Email"
        />
        <button className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
          {props.submitLabel ?? "Get started"}
        </button>
      </div>
    </div>
  </section>
);

export const Footer = (props: {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  copyrightText?: string;
}) => (
  <section
    id={props.anchorId}
    className={sectionClass({ className: props.className, hiddenOn: props.hiddenOn })}
  >
    <div className="rounded-xl border border-border/60 bg-muted/20 px-6 py-4 text-sm text-muted-foreground">
      {props.copyrightText ?? "All rights reserved."}
    </div>
  </section>
);
