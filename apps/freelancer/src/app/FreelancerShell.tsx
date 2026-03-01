import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Bot, FileText, Gauge, Receipt, Scale, Settings, Users } from "lucide-react";
import { Button } from "@corely/ui";
import { AppLayout, type AppNavItem } from "@corely/web-shared/layout";
import { Logo } from "@corely/web-shared/shared/components/Logo";
import { WorkspaceSwitcher } from "@corely/web-shared/shared/workspaces/WorkspaceSwitcher";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useAuth } from "@corely/web-shared/lib/auth-provider";

const navItems: AppNavItem[] = [
  { id: "overview", label: "Overview", route: "/overview", icon: Gauge },
  { id: "assistant", label: "Assistant", route: "/assistant", icon: Bot },
  { id: "clients", label: "Clients", route: "/clients", icon: Users },
  { id: "invoices", label: "Invoices", route: "/invoices", icon: FileText },
  { id: "expenses", label: "Expenses", route: "/expenses", icon: Receipt },
  { id: "tax", label: "Tax", route: "/tax", icon: Scale },
  { id: "portfolio", label: "Portfolio", route: "/portfolio/showcases", icon: Briefcase },
  { id: "settings", label: "Settings", route: "/settings", icon: Settings },
];

export const FreelancerShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { activeWorkspace, workspaces } = useWorkspace();

  const topbar = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {activeWorkspace?.name ?? "Workspace"}
        </span>
        {workspaces.length > 1 ? <WorkspaceSwitcher /> : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground md:inline">{user?.email ?? ""}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void logout().then(() => navigate("/auth/login", { replace: true }));
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  );

  const sidebarHeader = (
    <Link to="/overview" className="inline-flex">
      <Logo size="md" showText />
    </Link>
  );

  const sidebarFooter = (
    <div className="text-xs text-muted-foreground">
      <div>Freelancer workspace</div>
      <div className="truncate">{location.pathname}</div>
    </div>
  );

  return (
    <AppLayout
      navItems={navItems}
      sidebarHeader={sidebarHeader}
      sidebarFooter={sidebarFooter}
      topbar={topbar}
    >
      <Outlet />
    </AppLayout>
  );
};
