import React from "react";
import { sectionClass, type NailStudioGalleryMasonryViewProps } from "./shared";

export const NailStudioGalleryMasonryView = (props: NailStudioGalleryMasonryViewProps) => (
  <section id={props.anchorId ?? "galerie"} className={sectionClass(props, "py-14 sm:py-16")}>
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading}</h2>
        {props.intro ? <p className="text-muted-foreground">{props.intro}</p> : null}
      </div>

      <div className="columns-2 gap-4 space-y-4 md:columns-3">
        {props.imageUrls.length > 0 ? (
          props.imageUrls.map((imageUrl) => (
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Nail gallery"
              className="w-full break-inside-avoid rounded-2xl border border-border/70 object-cover shadow-sm"
            />
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            {props.emptyStateLabel || "Add gallery images to display this section."}
          </div>
        )}
      </div>
    </div>
  </section>
);
