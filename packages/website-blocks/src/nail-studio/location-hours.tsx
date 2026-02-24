import React from "react";
import { sectionClass, type NailStudioLocationHoursViewProps } from "./shared";

export const NailStudioLocationHoursView = (props: NailStudioLocationHoursViewProps) => (
  <section id={props.anchorId ?? "kontakt"} className={sectionClass(props, "py-14 sm:py-16")}>
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">{props.heading}</h2>
        {props.address ? <p className="text-sm text-muted-foreground">{props.address}</p> : null}
        {props.phone ? (
          <p className="text-sm">
            <a
              href={`tel:${props.phone}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {props.phone}
            </a>
          </p>
        ) : null}

        <ul className="space-y-2 text-sm">
          {props.hours.map((item) => (
            <li
              key={item.day}
              className="flex items-center justify-between border-b border-border/50 pb-2 last:border-none"
            >
              <span>{item.day}</span>
              <span className="text-muted-foreground">
                {item.open === "Closed" ? "Closed" : `${item.open} - ${item.close}`}
              </span>
            </li>
          ))}
        </ul>

        <ul className="space-y-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          {props.policies.map((policy) => (
            <li key={policy}>- {policy}</li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {props.mapEmbedUrl ? (
          <iframe
            src={props.mapEmbedUrl}
            title="Studio map"
            loading="lazy"
            className="h-[420px] w-full"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
            Add mapEmbedUrl to display map.
          </div>
        )}
      </div>
    </div>
  </section>
);
