import React from "react";
import { sectionClass, type TutoringInstructorViewProps } from "./shared";

export const TutoringInstructorView = (props: TutoringInstructorViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24")}>
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h2 className="text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-accent text-4xl">
          👩‍🏫
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-foreground">{props.name}</h3>
          <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">{props.bio}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {props.principles.map((item) => (
            <span
              key={item}
              className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);
