import * as React from "react";
import { cn } from "@/shared/lib/utils";

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variantClasses = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:scale-[0.98]",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover active:scale-[0.98]",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-secondary hover:border-border-strong active:scale-[0.98]",
  ghost: "text-foreground hover:bg-secondary active:scale-[0.98]",
  accent:
    "bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:bg-accent-hover hover:shadow-accent/30 active:scale-[0.98]",
  link: "text-accent underline-offset-4 hover:underline",
} as const;

const sizeClasses = {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-12 rounded-xl px-6 text-base",
  xl: "h-14 rounded-xl px-8 text-lg",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />
  )
);

Button.displayName = "Button";
