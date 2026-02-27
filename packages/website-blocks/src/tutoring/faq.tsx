import React from "react";
import { sectionClass, type TutoringFaqViewProps } from "./shared";

export const TutoringFaqView = (props: TutoringFaqViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24 bg-card")}>
    <div className="container mx-auto max-w-2xl px-4">
      <h2 className="mb-10 text-center text-2xl font-bold text-foreground md:text-4xl">
        {props.heading}
      </h2>
      <div className="space-y-3">
        {props.items.map((faq) => (
          <details key={faq.id} className="rounded-xl border border-border bg-background px-5">
            <summary className="cursor-pointer py-4 text-left font-semibold text-foreground hover:text-primary">
              {faq.question}
            </summary>
            <p className="pb-4 leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);
