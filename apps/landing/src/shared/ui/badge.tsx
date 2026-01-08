import * as React from "react";
import { cn } from "@/shared/lib/utils";

const variantClasses = {
  default: "bg-secondary text-secondary-foreground",
  accent: "bg-accent-muted text-accent",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
