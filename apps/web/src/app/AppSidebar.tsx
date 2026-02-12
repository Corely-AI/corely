import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, Moon, Sun, Globe, LogOut, Users } from "lucide-react";
import { Logo } from "@/shared/components/Logo";
import { Button } from "@corely/ui";
import { useThemeStore } from "@/shared/theme/themeStore";
import { cn } from "@/shared/lib/utils";
import { WorkspaceSwitcher } from "@/shared/workspaces/WorkspaceSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@corely/ui";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { getIconByName } from "@/shared/utils/iconMapping";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { WorkspaceTypeBadge } from "@/shared/workspaces/WorkspaceTypeBadge";
import { useTaxCapabilitiesQuery } from "@/modules/tax/hooks/useTaxCapabilitiesQuery";
import { useCanReadTenants } from "@/shared/lib/permissions";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  variant?: "desktop" | "mobile";
}

export function AppSidebar({ collapsed = false, onToggle, variant = "desktop" }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { can: canReadTenants } = useCanReadTenants();
  const {
    isLoading: isConfigLoading,
    error: configError,
    navigationGroups: visibleGroups,
  } = useWorkspaceConfig();
  const isHostScope = user?.activeTenantId === null;
  const hasTaxNav = React.useMemo(
    () => visibleGroups.some((group) => group.items.some((item) => item.route?.startsWith("/tax"))),
    [visibleGroups]
  );
  const { data: taxCapabilities } = useTaxCapabilitiesQuery(!isConfigLoading && hasTaxNav);
  const paymentsEnabled = taxCapabilities?.paymentsEnabled ?? false;

  const navigationGroups = React.useMemo(() => {
    const groups = paymentsEnabled
      ? visibleGroups
      : visibleGroups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.id !== "tax-payments"),
          }))
          .filter((group) => group.items.length > 0);

    // Platform navigation is host-only.
    if (isHostScope) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const route = item.route ?? "";
          return !route.startsWith("/settings/platform");
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [isHostScope, paymentsEnabled, visibleGroups]);

  const changeLanguage = (lang: string) => {
    void i18n.changeLanguage(lang);
    localStorage.setItem("Corely One ERP-language", lang);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const unknownLabel = t("common.unknown");

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground mx-auto"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Logo size="md" showText={!collapsed} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="px-3 py-3">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <nav
        className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin"
        data-testid={`sidebar-nav${variant === "mobile" ? "-mobile" : ""}`}
      >
        {isConfigLoading ? (
          /* Loading state */
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-sidebar-accent/30 rounded-lg" />
            ))}
          </div>
        ) : configError ? (
          /* Error state */
          <div className="px-3 py-4 text-sm text-muted-foreground">
            {t("errors.loadMenuFailed")}
          </div>
        ) : navigationGroups.length > 0 || canReadTenants ? (
          /* Server-driven navigation */
          <>
            {navigationGroups.map((group) => {
              return (
                <div key={group.id} className="space-y-1">
                  {!collapsed && (
                    <div className="px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(group.labelKey ?? group.defaultLabel)}
                    </div>
                  )}
                  {group.items.map((item) => {
                    const Icon = getIconByName(item.icon);
                    return (
                      <NavLink
                        key={item.id}
                        to={item.route || "#"}
                        end={item.exact || item.route === "/tax"}
                        data-testid={`nav-${item.id}`}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          )
                        }
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{t(item.labelKey ?? item.label)}</span>}
                        {!collapsed && item.pinned && (
                          <span className="ml-auto text-xs text-muted-foreground">📌</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}

            {canReadTenants && (
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("nav.groups.platform")}
                  </div>
                )}
                <NavLink
                  to="/settings/tenants"
                  end
                  data-testid="nav-platform-tenants"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )
                  }
                >
                  <Users className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{t("nav.tenants")}</span>}
                </NavLink>
              </div>
            )}

            {/* Workspace mode indicator */}
            {!collapsed && <WorkspaceTypeBadge />}
          </>
        ) : null}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Controls row */}
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-2 px-2")}>
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="text-lg leading-none">
                  {i18n.language === "de" ? "🇩🇪" : i18n.language === "vi" ? "🇻🇳" : "🇬🇧"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => changeLanguage("de")}>
                🇩🇪 {t("settings.languages.de")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("en")}>
                🇬🇧 {t("settings.languages.en")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("vi")}>
                🇻🇳 {t("settings.languages.vi")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User profile */}
        {!collapsed && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="user-menu-trigger"
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
              >
                {(() => {
                  const userName = (user?.name ?? "").trim();
                  const userInitials = userName
                    ? userName
                        .split(/\s+/)
                        .map((n) => n[0])
                        .join("")
                    : "?";

                  return (
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-sm font-medium">
                      {userInitials || unknownLabel}
                    </div>
                  );
                })()}
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.name ?? unknownLabel}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {activeWorkspace?.name || ""}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" data-testid="user-menu">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{user?.name ?? unknownLabel}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="logout"
                className="text-danger"
                onSelect={(event) => {
                  event.preventDefault();
                  void logout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("common.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}
