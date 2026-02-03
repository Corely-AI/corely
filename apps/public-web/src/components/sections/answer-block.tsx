import React from "react";
import { Badge } from "@corely/ui";

export function AnswerBlock({
  title,
  summary,
  bullets,
}: {
  title?: string;
  summary: string;
  bullets?: string[];
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">TL;DR</Badge>
        <h2 className="text-lg font-semibold text-foreground">{title ?? "Quick take"}</h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      {bullets && bullets.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
