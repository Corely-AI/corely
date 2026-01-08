import { Outlet } from "react-router-dom";
import { SiteHeader } from "@/shared/components/SiteHeader";
import { SiteFooter } from "@/shared/components/SiteFooter";

export function AppShell() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-spotlight" />
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-fade-bottom" />
      <div className="relative z-10">
        <SiteHeader />
        <main>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
