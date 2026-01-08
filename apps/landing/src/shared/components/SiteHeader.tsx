import { NavLink, Link } from "react-router-dom";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/Logo";
import { primaryNav } from "@/shared/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            className={cn(
              "hidden md:inline-flex",
              buttonVariants({ variant: "ghost", size: "sm" })
            )}
            href="https://docs.corely.ai"
          >
            Read docs
          </a>
          <a
            className={buttonVariants({ variant: "accent", size: "sm" })}
            href="mailto:hello@corely.ai"
          >
            Get early access
          </a>
        </div>
      </div>
      <div className="border-t border-border/60 md:hidden">
        <div className="container flex gap-3 overflow-x-auto py-2 text-xs font-medium text-muted-foreground">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-full border border-border px-3 py-1",
                  isActive ? "bg-secondary text-foreground" : "bg-background text-muted-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
