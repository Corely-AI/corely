import React from "react";
import Link from "next/link";
import { Badge, Button, Logo } from "@/components/ui";
import { resolveWorkspacePath } from "@/lib/urls";

export function SiteHeader({
  workspaceSlug,
  host,
}: {
  workspaceSlug?: string | null;
  host?: string | null;
}) {
  const homePath = resolveWorkspacePath({ host, workspaceSlug, path: "/" });
  const portfolioPath = resolveWorkspacePath({ host, workspaceSlug, path: "/portfolio" });
  const rentalsPath = resolveWorkspacePath({ host, workspaceSlug, path: "/rentals" });
  const blogPath = resolveWorkspacePath({ host, workspaceSlug, path: "/blog" });

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href={homePath}>
            <Logo size="sm" />
          </Link>
          {workspaceSlug ? <Badge variant="secondary">Workspace: {workspaceSlug}</Badge> : null}
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={portfolioPath}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Portfolio
          </Link>
          <Link
            href={rentalsPath}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Rentals
          </Link>
          <Link
            href={blogPath}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
        </nav>
        <Button asChild size="sm" variant="accent">
          <Link href={portfolioPath}>Explore</Link>
        </Button>
      </div>
    </header>
  );
}
