import React from "react";
import { sectionClass, type TutoringMethodViewProps } from "./shared";

export const TutoringMethodView = (props: TutoringMethodViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24 bg-card")}>
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>
        <p className="mx-auto max-w-lg text-muted-foreground">{props.subheading}</p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
        {props.steps.map((step, index) => (
          <div key={step.title} className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl">
              📘
            </div>
            <div className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {index + 1}
            </div>
            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
