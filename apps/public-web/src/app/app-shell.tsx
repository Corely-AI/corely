import { Link, NavLink, Outlet } from "react-router-dom";
import { Badge, Button, Logo, cn } from "@corely/ui";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

const navItems = [
  { label: "Portfolio", href: "/portfolio" },
  { label: "Rentals", href: "/rentals" },
  { label: "Blog", href: "/blog" },
];

export function AppShell() {
  const workspaceSlug = useWorkspaceSlug();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={buildWorkspacePath("/", workspaceSlug)}>
              <Logo size="sm" />
            </Link>
            {workspaceSlug ? <Badge variant="secondary">Workspace: {workspaceSlug}</Badge> : null}
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={buildWorkspacePath(item.href, workspaceSlug)}
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button asChild size="sm" variant="accent">
            <Link to={buildWorkspacePath("/portfolio", workspaceSlug)}>Explore</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>Corely Public Web</span>
          <div className="flex gap-4">
            <Link
              to={buildWorkspacePath("/portfolio", workspaceSlug)}
              className="transition-colors hover:text-foreground"
            >
              Portfolio
            </Link>
            <Link
              to={buildWorkspacePath("/rentals", workspaceSlug)}
              className="transition-colors hover:text-foreground"
            >
              Rentals
            </Link>
            <Link
              to={buildWorkspacePath("/blog", workspaceSlug)}
              className="transition-colors hover:text-foreground"
            >
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
