import React from "react";
import { sectionClass, type TutoringTestimonialsViewProps } from "./shared";

export const TutoringTestimonialsView = (props: TutoringTestimonialsViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24 bg-card")}>
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground">{props.subheading}</p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {props.items.map((item) => (
          <div
            key={item.context}
            className="space-y-3 rounded-2xl border border-border bg-background p-5 shadow-sm"
          >
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {item.context}
            </span>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <span className="font-semibold text-destructive">Trước:</span> {item.before}
              </p>
              <p className="text-foreground">
                <span className="font-semibold text-primary">Sau:</span> {item.after}
              </p>
            </div>
            <p className="text-xs italic text-muted-foreground">— Học viên (ẩn danh)</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
