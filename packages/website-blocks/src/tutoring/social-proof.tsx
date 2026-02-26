import React from "react";
import { sectionClass, type TutoringSocialProofViewProps } from "./shared";

export const TutoringSocialProofView = (props: TutoringSocialProofViewProps) => (
  <section id={props.anchorId} className={sectionClass(props, "bg-card border-y border-border")}>
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{props.heading}</span>
          <div className="flex gap-2">
            {props.socials.facebook ? (
              <a
                href={props.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Facebook
              </a>
            ) : null}
            {props.socials.instagram ? (
              <a
                href={props.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Instagram
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);
