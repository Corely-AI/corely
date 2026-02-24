import React from "react";
import { sectionClass, type NailStudioFaqViewProps } from "./shared";

export const NailStudioFaqView = (props: NailStudioFaqViewProps) => (
  <section
    id={props.anchorId ?? "faq"}
    className={sectionClass(props, "border-y border-border/60 bg-[#fbf8f5] py-14 sm:py-16")}
  >
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 sm:px-6">
      <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>

      {props.items.map((item) => (
        <details
          key={item.question}
          className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
        >
          <summary className="cursor-pointer list-none text-sm font-semibold">
            {item.question}
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  </section>
);
