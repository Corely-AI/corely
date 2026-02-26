import React from "react";
import { sectionClass, type NailStudioBookingStepsViewProps } from "./shared";

export const NailStudioBookingStepsView = (props: NailStudioBookingStepsViewProps) => (
  <section
    id={props.anchorId ?? "booking"}
    className={sectionClass(props, "border-y border-border/60 bg-[#f8f4ef] py-14 sm:py-16")}
  >
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
        {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {props.steps.map((step, index) => (
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
        href={props.ctaHref}
        className="inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
      >
        {props.ctaLabel}
      </a>
    </div>
  </section>
);
