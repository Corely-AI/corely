import React from "react";
import { sectionClass, type TutoringPasViewProps } from "./shared";

export const TutoringPasView = (props: TutoringPasViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24")}>
    <div className="container mx-auto max-w-3xl space-y-8 px-4 text-center">
      <h2 className="text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>

      <div className="space-y-5 text-left md:text-center">
        <div className="rounded-xl bg-accent/50 p-5 shadow-sm">
          <p className="leading-relaxed text-foreground">{props.problem}</p>
        </div>
        <div className="rounded-xl bg-accent/50 p-5 shadow-sm">
          <p className="leading-relaxed text-foreground">{props.agitation}</p>
        </div>
        <div className="rounded-xl bg-accent/50 p-5 shadow-sm">
          <p className="leading-relaxed text-foreground">{props.solution}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <p className="text-lg leading-relaxed text-foreground">{props.summary}</p>
      </div>

      <a
        href={props.ctaHref}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        {props.ctaLabel}
      </a>
    </div>
  </section>
);
