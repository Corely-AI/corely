import React from "react";
import { sectionClass, type TutoringHeroViewProps } from "./shared";

export const TutoringHeroView = (props: TutoringHeroViewProps) => (
  <section
    id={props.anchorId}
    className={sectionClass(props, "relative overflow-hidden hero-gradient")}
  >
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            {props.badgeLabel}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
            {props.headline}
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            {props.subheadline}
          </p>
          <ul className="space-y-2">
            {props.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-foreground">
                <span className="mt-0.5 shrink-0 text-primary">✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <a
              href={props.primaryCtaHref}
              className="inline-flex h-14 items-center justify-center rounded-xl bg-primary px-10 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              {props.primaryCtaLabel}
            </a>
            <a
              href={props.secondaryCtaHref}
              className="inline-flex h-14 items-center justify-center rounded-xl border-2 border-primary bg-primary/5 px-10 text-base font-semibold text-primary hover:bg-primary/10"
            >
              {props.secondaryCtaLabel}
            </a>
          </div>
        </div>

        <div className="relative isolate group">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-md transition-transform duration-500 group-hover:scale-[1.01]">
            {props.heroImageSrc ? (
              <img
                src={props.heroImageSrc}
                alt={props.heroImageAlt || "Tutoring hero image"}
                className="max-h-[500px] w-full object-cover object-top"
                loading="eager"
              />
            ) : (
              <div className="flex h-[420px] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                Hero image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
          </div>
        </div>
      </div>
    </div>
  </section>
);
