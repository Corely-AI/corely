import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@corely/web-shared/shared/lib/utils";

export type AppNavItem = {
  id: string;
  label: string;
  route: string;
  icon?: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

interface AppLayoutProps {
  navItems: AppNavItem[];
  sidebarHeader?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  topbar?: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout = ({
  navItems,
  sidebarHeader,
  sidebarFooter,
  topbar,
  children,
}: AppLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border p-4">{sidebarHeader}</div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.route}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )
                }
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        {sidebarFooter ? (
          <div className="border-t border-sidebar-border p-3">{sidebarFooter}</div>
        ) : null}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {topbar ? <header className="border-b border-border px-4 py-3">{topbar}</header> : null}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
};
