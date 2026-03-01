import React from "react";
import type { WorkspaceNavigationGroup } from "@corely/contracts";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  Globe,
  LogOut,
  Users,
  Store,
  BookOpen,
} from "lucide-react";
import { Logo } from "@corely/web-shared/shared/components/Logo";
import { useThemeStore } from "@corely/web-shared/shared/theme/themeStore";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { WorkspaceSwitcher } from "@corely/web-shared/shared/workspaces/WorkspaceSwitcher";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@corely/ui";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { getIconByName } from "@corely/web-shared/shared/utils/iconMapping";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import { WorkspaceTypeBadge } from "@corely/web-shared/shared/workspaces/WorkspaceTypeBadge";
import { useCanManageTenants, useCanReadTenants } from "@corely/web-shared/shared/lib/permissions";
import { getDocsBaseUrl } from "@corely/web-shared/shared/lib/docs-url";

export type WorkspaceSwitcherMode = "always" | "multi" | "hidden";

export interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  variant?: "desktop" | "mobile";
  navigationGroups?: WorkspaceNavigationGroup[];
  isConfigLoading?: boolean;
  configError?: Error | null;
  hiddenItemIds?: readonly string[];
  showPlatformAdminNav?: boolean;
  showWorkspaceTypeBadge?: boolean;
  workspaceSwitcherMode?: WorkspaceSwitcherMode;
  notificationBell?: React.ReactNode;
}

const isWorkspaceSwitcherVisible = (mode: WorkspaceSwitcherMode, workspaceCount: number) => {
  if (mode === "hidden") {
    return false;
  }

  if (mode === "multi") {
    return workspaceCount > 1;
  }

  return true;
};

const removeHiddenItems = (
  groups: WorkspaceNavigationGroup[],
  hiddenItemIds: readonly string[]
): WorkspaceNavigationGroup[] => {
  if (hiddenItemIds.length === 0) {
    return groups;
  }

  const hiddenIds = new Set(hiddenItemIds);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !hiddenIds.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
};

export function AppSidebar({
  collapsed = false,
  onToggle,
  variant = "desktop",
  navigationGroups,
  isConfigLoading,
  configError,
  hiddenItemIds,
  showPlatformAdminNav = true,
  showWorkspaceTypeBadge = true,
  workspaceSwitcherMode = "always",
  notificationBell,
}: AppSidebarProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuth();
  const { activeWorkspace, workspaces } = useWorkspace();
  const { can: canReadTenants } = useCanReadTenants();
  const { can: canManageTenants } = useCanManageTenants();
  const {
    isLoading: isWorkspaceConfigLoading,
    error: workspaceConfigError,
    navigationGroups: workspaceNavigationGroups,
  } = useWorkspaceConfig();

  const resolvedLoading = isConfigLoading ?? isWorkspaceConfigLoading;
  const resolvedError = configError ?? workspaceConfigError;
  const workspaceCount = Array.isArray(workspaces) ? workspaces.length : 0;
  const showSwitcher = isWorkspaceSwitcherVisible(workspaceSwitcherMode, workspaceCount);
  const isHostScope = user?.activeTenantId === null;

  const resolvedGroups = React.useMemo(() => {
    const sourceGroups = navigationGroups ?? workspaceNavigationGroups;
    const groupsWithoutHiddenItems = removeHiddenItems(sourceGroups, hiddenItemIds ?? []);

    if (isHostScope) {
      return groupsWithoutHiddenItems;
    }

    return groupsWithoutHiddenItems
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const route = item.route ?? "";
          return !route.startsWith("/settings/platform");
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [hiddenItemIds, isHostScope, navigationGroups, workspaceNavigationGroups]);

  const changeLanguage = (lang: string) => {
    void i18n.changeLanguage(lang);
    localStorage.setItem("Corely One ERP-language", lang);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const unknownLabel = t("common.unknown");
  const docsUrl = getDocsBaseUrl(i18n.language);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
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

      <div className="px-3 py-3">
        {showSwitcher ? <WorkspaceSwitcher collapsed={collapsed} /> : null}
      </div>

      <nav
        className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin"
        data-testid={`sidebar-nav${variant === "mobile" ? "-mobile" : ""}`}
      >
        {resolvedLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-sidebar-accent/30 rounded-lg" />
            ))}
          </div>
        ) : resolvedError ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            {t("errors.loadMenuFailed")}
          </div>
        ) : resolvedGroups.length > 0 ||
          (showPlatformAdminNav && (canReadTenants || canManageTenants)) ? (
          <>
            {resolvedGroups.map((group) => {
              return (
                <div key={group.id} className="space-y-1">
                  {!collapsed && (
                    <div className="px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(group.labelKey ?? group.defaultLabel)}
                    </div>
                  )}
                  {group.items.map((item) => {
                    const Icon = getIconByName(item.icon);
                    const openInNewTab =
                      item.id === "booking-public-page" || item.route === "/booking/public-page";
                    return (
                      <NavLink
                        key={item.id}
                        to={item.route || "#"}
                        end={item.exact || item.route === "/tax"}
                        target={openInNewTab ? "_blank" : undefined}
                        rel={openInNewTab ? "noreferrer" : undefined}
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

            {showPlatformAdminNav && (canReadTenants || canManageTenants) && (
              <div className="space-y-1">
                {!collapsed && (
                  <div className="px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("nav.groups.platform")}
                  </div>
                )}
                {canReadTenants && (
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
                )}
                {canManageTenants && (
                  <NavLink
                    to="/directory/restaurants"
                    data-testid="nav-directory-restaurants"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <Store className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{t("nav.directory.restaurants")}</span>}
                  </NavLink>
                )}
              </div>
            )}

            {!collapsed && showWorkspaceTypeBadge ? <WorkspaceTypeBadge /> : null}
          </>
        ) : null}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-2 px-2")}>
          {notificationBell ?? null}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

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

          {!collapsed ? (
            <Button variant="ghost" size="icon-sm" asChild>
              <a href={docsUrl} target="_blank" rel="noreferrer" aria-label={t("common.docs")}>
                <Globe className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>

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
              <DropdownMenuItem asChild>
                <a href={docsUrl} target="_blank" rel="noreferrer">
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t("common.docs")}
                </a>
              </DropdownMenuItem>
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
