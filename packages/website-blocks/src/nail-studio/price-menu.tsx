import React from "react";
import { sectionClass, type NailStudioPriceMenuViewProps } from "./shared";

export const NailStudioPriceMenuView = (props: NailStudioPriceMenuViewProps) => (
  <section
    id={props.anchorId ?? "preise"}
    className={sectionClass(props, "border-y border-border/60 bg-[#f9f6f2] py-14 sm:py-16")}
  >
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
        {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {props.categories.map((category) => (
          <article
            key={category.title}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold">{category.title}</h3>
            <div className="mt-4 space-y-3">
              {category.items.map((item) => (
                <div
                  key={`${item.name}-${item.priceFrom}`}
                  className="flex items-start justify-between gap-4 border-b border-border/50 pb-3 last:border-none last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.duration, item.note].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{item.priceFrom}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
