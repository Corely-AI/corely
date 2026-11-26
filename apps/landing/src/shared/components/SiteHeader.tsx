import {
  BrowserLanguageSelect,
  useBrowserLocale,
} from "@corely/web-shared/shared/i18n/browser-locale";
import messages from "@/shared/i18n/locales/landing.json";
import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/Logo";
import { primaryNav } from "@/shared/lib/site";

export function SiteHeader() {
  const copy = messages[useBrowserLocale()];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
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
              {copy[item.label]}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <BrowserLanguageSelect className="max-w-28 rounded-md border border-input bg-background px-2 py-2 text-sm min-[375px]:max-w-44" />
          <a
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden lg:inline-flex"
            )}
            href="https://docs.corely.one"
          >
            {copy.docs}
          </a>
          <a
            className={cn(
              buttonVariants({ variant: "accent", size: "sm" }),
              "hidden lg:inline-flex"
            )}
            href="mailto:hello@corely.one"
          >
            {copy.earlyAccess}
          </a>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={copy.menu}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background p-6 shadow-lg lg:hidden animate-in slide-in-from-top-2">
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
                {copy[item.label]}
              </NavLink>
            ))}
            <hr className="border-border" />
            <a className="text-sm font-medium text-foreground" href="mailto:hello@corely.one">
              {copy.earlyAccess}
            </a>
            <a
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              href="https://docs.corely.one"
            >
              {copy.docs}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
