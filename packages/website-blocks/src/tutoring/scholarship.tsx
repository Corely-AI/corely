import React from "react";
import { sectionClass, type TutoringScholarshipViewProps } from "./shared";

export const TutoringScholarshipView = (props: TutoringScholarshipViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24")}>
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-accent/50 p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 text-2xl">
          🏅
        </div>
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">{props.heading}</h2>
        <p className="leading-relaxed text-muted-foreground">{props.body}</p>
        <a
          href={props.ctaHref}
          className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-primary bg-primary/5 px-8 text-base font-semibold text-primary hover:bg-primary/10"
        >
          {props.ctaLabel}
        </a>
      </div>
    </div>
  </section>
);
