import React from "react";
import { sectionClass, type NailStudioTeamViewProps } from "./shared";

export const NailStudioTeamView = (props: NailStudioTeamViewProps) => (
  <section
    id={props.anchorId ?? "team"}
    className={sectionClass(props, "border-y border-border/60 bg-[#faf7f3] py-14 sm:py-16")}
  >
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
        {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {props.members.map((member) => (
          <article
            key={member.name}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            {member.imageSrc ? (
              <img
                src={member.imageSrc}
                alt={member.name}
                className="h-48 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                Artist image
              </div>
            )}
            <h3 className="mt-4 text-lg font-semibold">{member.name}</h3>
            <p className="text-sm text-muted-foreground">
              {[member.role, member.specialty].filter(Boolean).join(" - ")}
            </p>
            {member.bio ? <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p> : null}
          </article>
        ))}
      </div>
    </div>
  </section>
);
