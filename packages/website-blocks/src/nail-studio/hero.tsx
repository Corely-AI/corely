import React from "react";
import { sectionClass, type NailStudioHeroViewProps } from "./shared";

export const NailStudioHeroView = (props: NailStudioHeroViewProps) => (
  <section
    id={props.anchorId ?? "hero"}
    className={sectionClass(
      props,
      "border-b border-border/60 bg-gradient-to-b from-[#faf7f4] to-background py-14 sm:py-20"
    )}
  >
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {props.eyebrow || "Boutique Nail Studio"}
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          {props.headline}
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{props.subheadline}</p>

        <div className="flex flex-wrap gap-3">
          <a
            href={props.primaryCtaHref}
            className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
          >
            {props.primaryCtaLabel}
          </a>
          <a
            href={props.secondaryCtaHref}
            className="rounded-full border border-border/80 bg-card px-6 py-3 text-sm font-semibold text-foreground"
          >
            {props.secondaryCtaLabel}
          </a>
        </div>

        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          {props.highlights.map((item) => (
            <li
              key={item}
              className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-center"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        {props.imageSrc ? (
          <img
            src={props.imageSrc}
            alt="Nail studio hero"
            className="h-[420px] w-full rounded-[2rem] border border-border/60 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-[420px] w-full items-center justify-center rounded-[2rem] border border-dashed border-border bg-card text-sm text-muted-foreground">
            Hero image
          </div>
        )}
        <div className="absolute -bottom-4 left-4 rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-xs text-muted-foreground shadow-sm">
          Hygienic. Precise. Booking-first.
        </div>
      </div>
    </div>
  </section>
);
