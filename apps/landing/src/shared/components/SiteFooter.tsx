import { Link } from "react-router-dom";
import { footerNav, siteConfig } from "@/shared/lib/site";
import { Logo } from "@/shared/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container space-y-10 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Logo />
            <p className="text-sm text-muted-foreground">{siteConfig.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>AI-native ERP kernel</span>
            <span className="text-border">/</span>
            <span>Freelancer to company</span>
            <span className="text-border">/</span>
            <span>Developer-friendly</span>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Product
            </div>
            {footerNav.product.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Platform
            </div>
            {footerNav.platform.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Legal
            </div>
            {footerNav.legal.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Copyright {new Date().getFullYear()} Corely. All rights reserved.</span>
          <span>Built in Europe with calm defaults.</span>
        </div>
      </div>
    </footer>
  );
}
