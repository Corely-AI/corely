import * as React from "react";
import { cn } from "@/shared/lib/utils";

interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-h2 text-foreground">{title}</h2>
      {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
    </div>
  );
}
