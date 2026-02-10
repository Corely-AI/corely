import React from "react";
import Link from "next/link";
import { resolveWorkspacePath } from "@/lib/urls";

export function SiteFooter({
  workspaceSlug,
  host,
}: {
  workspaceSlug?: string | null;
  host?: string | null;
}) {
  const portfolioPath = resolveWorkspacePath({ host, workspaceSlug, path: "/portfolio" });
  const rentalsPath = resolveWorkspacePath({ host, workspaceSlug, path: "/rentals" });
  const cmsPath = resolveWorkspacePath({ host, workspaceSlug, path: "/cms" });

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>Corely Public Web</span>
        <div className="flex gap-4">
          <Link href={portfolioPath} className="transition-colors hover:text-foreground">
            Portfolio
          </Link>
          <Link href={rentalsPath} className="transition-colors hover:text-foreground">
            Rentals
          </Link>
          <Link href={cmsPath} className="transition-colors hover:text-foreground">
            CMS
          </Link>
        </div>
      </div>
    </footer>
  );
}
