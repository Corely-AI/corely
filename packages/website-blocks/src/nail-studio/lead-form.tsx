import React from "react";
import { sectionClass, type NailStudioLeadFormViewProps } from "./shared";

export const NailStudioLeadFormView = (props: NailStudioLeadFormViewProps) => (
  <section id={props.anchorId ?? "lead-form"} className={sectionClass(props, "py-14 sm:py-16")}>
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">{props.heading}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{props.note}</p>

      <form id={props.formId} className="mt-5 space-y-3">
        <input
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          placeholder={props.namePlaceholder || "Name"}
        />
        <input
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          placeholder={props.contactPlaceholder || "Phone or email"}
        />
        <textarea
          className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          placeholder={props.requestPlaceholder || "Desired service and preferred time"}
        />
        <button
          type="button"
          className="h-11 w-full rounded-xl bg-foreground text-sm font-semibold text-background"
        >
          {props.submitLabel}
        </button>
      </form>
    </div>
  </section>
);
