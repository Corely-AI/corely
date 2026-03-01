import React, { useEffect, useMemo, useState } from "react";
import type { WorkspaceConfig, WorkspaceNavigationGroup } from "@corely/contracts";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@corely/ui";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { WorkspaceSwitcher } from "@corely/web-shared/shared/workspaces/WorkspaceSwitcher";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { CommandPaletteProvider } from "@corely/web-shared/shared/command-palette/command-palette-provider";
import { useCommandPalette } from "@corely/web-shared/shared/command-palette/use-command-palette";
import type { Command } from "@corely/web-shared/shared/command-palette/types";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import { getIconByName } from "@corely/web-shared/shared/utils/iconMapping";
import { useTranslation } from "react-i18next";
import { AppSidebar, type AppSidebarProps, type WorkspaceSwitcherMode } from "./app-sidebar";

interface QuickActionConfig {
  id: string;
  labelKey?: string;
  route?: string;
  icon?: string;
}

interface SidebarRenderProps extends AppSidebarProps {
  variant: "desktop" | "mobile";
}

export interface AppShellProps {
  navigationGroups?: WorkspaceNavigationGroup[];
  config?: WorkspaceConfig | null;
  isConfigLoading?: boolean;
  configError?: Error | null;
  sidebarProps?: Omit<AppSidebarProps, "variant" | "collapsed" | "onToggle">;
  includeWorkspaceQuickActions?: boolean;
  renderSidebar?: (props: SidebarRenderProps) => React.ReactNode;
}

const normalizeLabel = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseQuickActionConfig = (value: unknown): QuickActionConfig[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  const rawActions = (value as { actions?: unknown }).actions;
  if (!Array.isArray(rawActions)) {
    return [];
  }

  const parsedActions: Array<QuickActionConfig | null> = rawActions.map((rawAction) => {
    if (!rawAction || typeof rawAction !== "object") {
      return null;
    }

    const action = rawAction as {
      id?: unknown;
      labelKey?: unknown;
      route?: unknown;
      icon?: unknown;
    };
    if (typeof action.id !== "string" || !action.id) {
      return null;
    }

    return {
      id: action.id,
      labelKey: typeof action.labelKey === "string" ? action.labelKey : undefined,
      route: typeof action.route === "string" ? action.route : undefined,
      icon: typeof action.icon === "string" ? action.icon : undefined,
    };
  });

  return parsedActions.filter((action): action is QuickActionConfig => action !== null);
};

const CommandPaletteSync = ({
  commands,
  namespace,
}: {
  commands: Command[];
  namespace: string;
}) => {
  const { setCommands, setNamespace } = useCommandPalette();

  useEffect(() => {
    setCommands(commands);
  }, [commands, setCommands]);

  useEffect(() => {
    setNamespace(namespace);
  }, [namespace, setNamespace]);

  return null;
};

const showWorkspaceSwitcher = (mode: WorkspaceSwitcherMode, workspaceCount: number) => {
  if (mode === "hidden") {
    return false;
  }

  if (mode === "multi") {
    return workspaceCount > 1;
  }

  return true;
};

export function AppShell({
  navigationGroups,
  config,
  isConfigLoading,
  configError,
  sidebarProps,
  includeWorkspaceQuickActions = true,
  renderSidebar,
}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const {
    config: workspaceConfig,
    isLoading: workspaceConfigLoading,
    error: workspaceConfigError,
    navigationGroups: workspaceNavigationGroups,
  } = useWorkspaceConfig();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const resolvedConfig = config ?? workspaceConfig;
  const resolvedIsConfigLoading = isConfigLoading ?? workspaceConfigLoading;
  const resolvedConfigError = configError ?? workspaceConfigError;
  const resolvedNavigationGroups = navigationGroups ?? workspaceNavigationGroups;

  const commands = useMemo(() => {
    const navigationCommands: Command[] = resolvedNavigationGroups.flatMap((group) =>
      group.items
        .filter((item) => Boolean(item.route))
        .map((item) => {
          const Icon = getIconByName(item.icon);
          return {
            id: `menu:${item.id}`,
            title: t(item.labelKey ?? item.label),
            subtitle: group.defaultLabel,
            keywords: [item.section, ...(item.tags ?? []), item.route ?? ""].filter(Boolean),
            group: "Navigate",
            icon: <Icon className="h-4 w-4" />,
            run: ({ navigate: runNavigate }) => runNavigate(item.route as string),
          } satisfies Command;
        })
    );

    if (!includeWorkspaceQuickActions || !resolvedConfig) {
      return navigationCommands;
    }

    const quickActionWidget = resolvedConfig.home.widgets.find(
      (widget) => widget.widgetType === "quick-actions"
    );
    const quickActions = parseQuickActionConfig(quickActionWidget?.config);
    const createCommands: Command[] = quickActions
      .filter((action) => Boolean(action.route))
      .map((action) => {
        const Icon = getIconByName(action.icon ?? "HelpCircle");
        const translatedLabel = action.labelKey ? t(action.labelKey) : "";
        const title =
          translatedLabel && translatedLabel !== action.labelKey
            ? translatedLabel
            : normalizeLabel(action.id);

        return {
          id: `quick-action:${action.id}`,
          title,
          subtitle: t("dashboard.quickActions"),
          keywords: ["quick action", "create", ...(action.route ? [action.route] : [])],
          group: "Create",
          icon: <Icon className="h-4 w-4" />,
          run: ({ navigate: runNavigate }) => runNavigate(action.route as string),
        } satisfies Command;
      });

    return [...navigationCommands, ...createCommands];
  }, [resolvedNavigationGroups, resolvedConfig, includeWorkspaceQuickActions, t]);

  const namespace = useMemo(
    () => `${user?.userId ?? "anon"}:${activeWorkspaceId ?? "default"}`,
    [user?.userId, activeWorkspaceId]
  );
  const commandContext = useMemo(
    () => ({
      navigate: (to: string) => navigate(to),
      openExternal: (url: string) => {
        if (typeof window === "undefined") {
          return;
        }

        window.open(url, "_blank", "noopener,noreferrer");
      },
      locationPathname: location.pathname,
    }),
    [navigate, location.pathname]
  );

  const sidebarSwitcherMode = sidebarProps?.workspaceSwitcherMode ?? "always";
  const workspaceCount = Array.isArray(workspaces) ? workspaces.length : 0;
  const showMobileSwitcher = showWorkspaceSwitcher(sidebarSwitcherMode, workspaceCount);

  const baseSidebarProps: Omit<SidebarRenderProps, "variant"> = {
    collapsed: false,
    onToggle: undefined,
    navigationGroups: resolvedNavigationGroups,
    isConfigLoading: resolvedIsConfigLoading,
    configError: resolvedConfigError,
    ...sidebarProps,
  };

  const sidebarRenderer =
    renderSidebar ??
    ((props: SidebarRenderProps) => {
      return <AppSidebar {...props} />;
    });

  return (
    <CommandPaletteProvider
      commandContext={commandContext}
      initialCommands={commands}
      initialNamespace={namespace}
    >
      <CommandPaletteSync commands={commands} namespace={namespace} />
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <div className="hidden lg:block relative z-30 pointer-events-auto">
          {sidebarRenderer({
            ...baseSidebarProps,
            variant: "desktop",
            collapsed: sidebarCollapsed,
            onToggle: () => setSidebarCollapsed(!sidebarCollapsed),
          })}
        </div>

        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarRenderer({
            ...baseSidebarProps,
            variant: "mobile",
            onToggle: () => setMobileSidebarOpen(false),
          })}
        </div>

        <main className="relative z-0 flex-1 flex flex-col overflow-hidden">
          <header className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-background">
            <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {showMobileSwitcher ? (
              <div className="flex-1 px-3">
                <WorkspaceSwitcher />
              </div>
            ) : (
              <div className="flex-1" />
            )}
          </header>

          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </CommandPaletteProvider>
  );
}
