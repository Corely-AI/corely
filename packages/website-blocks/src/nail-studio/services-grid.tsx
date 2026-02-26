import React from "react";
import { sectionClass, type NailStudioServicesGridViewProps } from "./shared";

export const NailStudioServicesGridView = (props: NailStudioServicesGridViewProps) => (
  <section id={props.anchorId ?? "services"} className={sectionClass(props, "py-14 sm:py-16")}>
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
        {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.services.map((service) => (
          <article
            key={`${service.name}-${service.duration ?? ""}`}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold">{service.name}</h3>
              {service.priceFrom ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {service.priceFrom}
                </span>
              ) : null}
            </div>
            {service.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
            ) : null}
            {service.duration ? (
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                {service.duration}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  </section>
);
