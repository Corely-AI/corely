import React from "react";
import { sectionClass, type TutoringScheduleViewProps } from "./shared";

export const TutoringScheduleView = (props: TutoringScheduleViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24 bg-card")}>
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h2 className="text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>
        <div className="space-y-4 rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-primary">📅</span>
              <span className="font-semibold">{props.dateLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-primary">⏰</span>
              <span className="font-semibold">{props.timeLabel}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{props.note}</p>
          <a
            href={props.ctaHref}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
          >
            {props.ctaLabel}
          </a>
        </div>
        <p className="text-sm text-muted-foreground">{props.footerNote}</p>
      </div>
    </div>
  </section>
);
