import React from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getRequestContext } from "@/lib/request-context";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const { host } = getRequestContext();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader host={host} />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
      <SiteFooter host={host} />
    </div>
  );
}
