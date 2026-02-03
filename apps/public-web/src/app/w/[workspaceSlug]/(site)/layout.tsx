import React from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getRequestContext } from "@/lib/request-context";

export default async function WorkspaceSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { host } = await getRequestContext();
  const { workspaceSlug } = await params;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader workspaceSlug={workspaceSlug} host={host} />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
      <SiteFooter workspaceSlug={workspaceSlug} host={host} />
    </div>
  );
}
