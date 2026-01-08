import { cn } from "@/shared/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/70 to-primary/80 opacity-80" />
        <span className="relative text-xs font-semibold">C</span>
      </span>
      {showWordmark ? <span className="text-sm font-semibold tracking-wide">Corely</span> : null}
    </div>
  );
}
