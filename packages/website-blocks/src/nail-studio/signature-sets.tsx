import React from "react";
import { sectionClass, type NailStudioSignatureSetsViewProps } from "./shared";

export const NailStudioSignatureSetsView = (props: NailStudioSignatureSetsViewProps) => (
  <section
    id={props.anchorId ?? "signature-sets"}
    className={sectionClass(props, "py-14 sm:py-16")}
  >
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
        {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {props.sets.map((set) => (
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
        href={props.ctaHref}
        className="inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
      >
        {props.ctaLabel}
      </a>
    </div>
  </section>
);
