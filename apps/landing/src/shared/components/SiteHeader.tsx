import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/Logo";
import { primaryNav } from "@/shared/lib/site";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            href="https://docs.corely.one"
          >
            Read docs
          </a>
          <a
            className={buttonVariants({ variant: "accent", size: "sm" })}
            href="mailto:hello@corely.one"
          >
            Get early access
          </a>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background p-6 shadow-lg md:hidden animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4">
            {primaryNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <hr className="border-border" />
            <a
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              href="https://docs.corely.one"
            >
              Read docs
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
