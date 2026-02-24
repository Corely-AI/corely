import React from "react";
import { sectionClass, type NailStudioTestimonialsViewProps } from "./shared";

export const NailStudioTestimonialsView = (props: NailStudioTestimonialsViewProps) => (
  <section id={props.anchorId ?? "testimonials"} className={sectionClass(props, "py-14 sm:py-16")}>
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {props.items.map((item, index) => (
          <blockquote
            key={`${item.quote}-${index}`}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">"{item.quote}"</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold">{item.author || "Guest"}</span>
              <span className="text-xs text-muted-foreground">{"★".repeat(item.rating ?? 5)}</span>
            </div>
          </blockquote>
        ))}
      </div>
    </div>
  </section>
);
