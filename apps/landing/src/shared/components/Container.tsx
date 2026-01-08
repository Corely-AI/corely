import * as React from "react";
import { cn } from "@/shared/lib/utils";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("container", className)} {...props} />;
}
