import { useBrowserLocale } from "@corely/web-shared/shared/i18n/browser-locale";
import messages from "@/shared/i18n/locales/landing.json";
import { Link } from "react-router-dom";
import { footerNav } from "@/shared/lib/site";
import { Logo } from "@/shared/components/Logo";

export function SiteFooter() {
  const copy = messages[useBrowserLocale()];
  return (
    <footer className="border-t border-border bg-background">
      <div className="container space-y-10 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Logo />
            <p className="text-sm text-muted-foreground">{copy.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{copy.kernel}</span>
            <span className="text-border">/</span>
            <span>{copy.freelancerToCompany}</span>
            <span className="text-border">/</span>
            <span>{copy.developerFriendly}</span>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {copy.product}
            </div>
            {footerNav.product.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block text-muted-foreground hover:text-foreground"
              >
                {copy[item.label]}
              </Link>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {copy.platform}
            </div>
            {footerNav.platform.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block text-muted-foreground hover:text-foreground"
              >
                {item.label === "GitHub" ? item.label : copy[item.label]}
              </a>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {copy.legal}
            </div>
            {footerNav.legal.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block text-muted-foreground hover:text-foreground"
              >
                {copy[item.label]}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.copyright.replace("{{year}}", String(new Date().getFullYear()))}</span>
          <span>{copy.built}</span>
        </div>
      </div>
    </footer>
  );
}
