import React from "react";
import { sectionClass, type TutoringProgramHighlightsViewProps } from "./shared";

export const TutoringProgramHighlightsView = (props: TutoringProgramHighlightsViewProps) => (
  <section
    id={props.anchorId ?? "diem-khac-biet"}
    className={sectionClass(props, "py-16 md:py-24 bg-card/50")}
  >
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">{props.subheading}</p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
        {props.items.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border/50 bg-background p-6 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              ★
            </div>
            <h3 className="mb-3 text-lg font-bold text-foreground">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-accent bg-accent/30 p-6 text-center md:p-8">
        <p className="italic text-foreground">{props.quote}</p>
        <p className="mt-2 font-bold text-primary">{props.quoteAuthor}</p>
      </div>
    </div>
  </section>
);
