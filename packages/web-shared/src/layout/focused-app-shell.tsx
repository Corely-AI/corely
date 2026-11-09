import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useBeforeUnload, useLocation, useNavigate } from "react-router-dom";
import { Grid2X2, Menu, Search, UserRound } from "lucide-react";
import type { AppLaunchId } from "@corely/contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@corely/ui";
import { useSession } from "../session/session-context";
import { useOptionalWorkspaceSession } from "../session/workspace-session-context";
import { CommandPaletteProvider } from "../shared/command-palette/command-palette-provider";
import { useCommandPalette } from "../shared/command-palette/use-command-palette";
import type { Command } from "../shared/command-palette/types";
import { AppSwitcher } from "./app-switcher";
import { focusedShellCopy, type FocusedShellLocale } from "./focused-shell-copy";
import {
  buildWorkspaceLaunchUrl,
  catalogLaunchUrl,
  focusedActions,
  focusedNavigation,
  type FocusedShellAction,
} from "./focused-shell-navigation";
import { useFocusedShellData } from "./use-focused-shell-data";

export interface FocusedAppShellProps {
  app: AppLaunchId;
  label: string;
  /** Approved route roots from the owning focused client. */
  routeRoots: readonly string[];
  navigationLabels?: Readonly<Record<string, string>>;
  /** Exact deployment configuration, never a URL query parameter. */
  appCenterOrigin: string;
  workspace: { id: string; name: string };
  /** Choices already resolved by the workspace owner. Selection must rebind SessionProviders. */
  workspaces?: readonly { id: string; name: string }[];
  onWorkspaceChange?: (id: string) => void;
  actions?: readonly FocusedShellAction[];
  isDirty?: boolean;
  locale?: FocusedShellLocale;
  children: React.ReactNode;
}

function PaletteControls({ commands, label }: { commands: Command[]; label: string }) {
  const { open, setCommands } = useCommandPalette();
  useEffect(() => setCommands(commands), [commands, setCommands]);
  return (
    <Button
      variant="outline"
      onClick={open}
      aria-label={label}
      aria-keyshortcuts="Control+k Meta+k"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">{label}</span>
    </Button>
  );
}

/** Focused clients opt in; existing full-workspace clients keep AppShell. */
export function FocusedAppShell({
  app,
  label,
  routeRoots,
  navigationLabels = {},
  appCenterOrigin,
  workspace,
  workspaces,
  onWorkspaceChange,
  actions = [],
  isDirty = false,
  locale = "en",
  children,
}: FocusedAppShellProps) {
  const { client, state, logout } = useSession();
  const workspaceSession = useOptionalWorkspaceSession();
  const pendingWrites = workspaceSession?.pendingWrites ?? 0;
  const hasUnsavedChanges = isDirty || Boolean(workspaceSession?.hasUnsavedChanges);
  const routerGuardActive = Boolean(
    workspaceSession && (workspaceSession.hasUnsavedChanges || pendingWrites)
  );
  const { ready, navigation, launches } = useFocusedShellData(app, workspace.id);
  const navigate = useNavigate();
  const location = useLocation();
  const copy = focusedShellCopy[locale];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, setPending] = useState<{ action: () => void; context: object } | null>(null);
  const [launchError, setLaunchError] = useState(false);
  const [launching, setLaunching] = useState(false);
  const allowUnload = useRef(false);
  const groups = focusedNavigation(
    app,
    workspace.id,
    ready && !navigation.isError ? navigation.data : undefined,
    routeRoots
  ).map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      label: (item.labelKey && navigationLabels[item.labelKey]) || item.label,
    })),
  }));
  const availableActions = focusedActions(groups, actions, routeRoots);
  const items = groups.flatMap((group) => group.items);
  const namespace = `${state.status === "authenticated" ? state.session.user.userId : "anon"}:${client.config.tenantId}:${workspace.id}:${app}`;
  const allAppsUrl = buildWorkspaceLaunchUrl(appCenterOrigin, workspace.id);
  const navigationKey = JSON.stringify([
    namespace,
    location.key,
    routeRoots,
    items.map((item) => [item.id, item.route]),
    availableActions.map((action) => [action.id, action.route]),
    workspaces?.map((entry) => entry.id),
    Boolean(onWorkspaceChange),
    allAppsUrl,
    launches.isError,
    launches.data?.map((entry) => [
      entry.launch?.launchId,
      entry.enabled,
      entry.launch?.availability,
      entry.launch?.url,
    ]),
  ]);
  // Use an identity, so leaving and returning to the same scope cannot revive old work.
  const actionContext = useMemo(() => ({}), [navigationKey, client]);
  const currentContext = useRef(actionContext);
  currentContext.current = actionContext;
  const latestLaunchRequest = useRef(0);
  useEffect(() => {
    setPending(null);
    setLaunchError(false);
    setLaunching(false);
  }, [actionContext]);
  const verified =
    ready &&
    navigation.data?.launchId === app &&
    navigation.data.workspaceId === workspace.id &&
    !navigation.isError;

  useBeforeUnload(
    React.useCallback(
      (event: BeforeUnloadEvent) => {
        if ((hasUnsavedChanges || pendingWrites) && !allowUnload.current) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [hasUnsavedChanges, pendingWrites]
    )
  );

  const guard = (action: () => void) => {
    if (hasUnsavedChanges || pendingWrites) {
      setPending({ action, context: actionContext });
    } else {
      action();
    }
  };
  const currentGuard = useRef(guard);
  currentGuard.current = guard;
  // Menu/action routes are app-owned and validated above. Carry tab intent in both
  // router navigation and rendered hrefs (including Ctrl-click/open in new tab).
  const scopedRoute = (route: string) => {
    if (!workspaceSession) {
      return route;
    }
    const url = new URL(route, "https://local.invalid");
    url.searchParams.set("workspaceId", workspaceSession.scope.workspaceId);
    return `${url.pathname}${url.search}${url.hash}`;
  };
  const go = (route: string) => {
    const action = () => {
      setMobileOpen(false);
      navigate(scopedRoute(route));
    };
    if (routerGuardActive) {
      action();
    } else {
      guard(action);
    }
  };
  const leavePage = (url: string) => {
    const action = () => {
      allowUnload.current = true;
      window.location.assign(url);
    };
    if (workspaceSession) {
      workspaceSession.confirmExternalNavigation(action);
    } else {
      action();
    }
  };
  const launch = async (id: AppLaunchId) => {
    const context = actionContext;
    const request = ++latestLaunchRequest.current;
    setLaunching(true);
    setLaunchError(false);
    const result = await launches.refetch();
    if (currentContext.current !== context || latestLaunchRequest.current !== request) {
      return;
    }
    const target = !result.isError && result.data?.find((entry) => entry.launch?.launchId === id);
    const url = target ? catalogLaunchUrl(target, workspace.id) : undefined;
    setLaunching(false);
    if (url) {
      // The user can edit while the request is pending. Ask using the latest dirty state.
      currentGuard.current(() => leavePage(url));
    } else {
      setLaunchError(true);
    }
  };
  const commands: Command[] = [
    ...items.map((item) => ({
      id: `menu:${item.id}`,
      title: item.label,
      group: "Navigate",
      run: () => go(item.route),
    })),
    ...availableActions.map((action) => ({
      id: `create:${action.id}`,
      title: action.label,
      group: "Create",
      run: () => go(action.route),
    })),
  ];
  const commandContext = useMemo(
    () => ({ navigate, openExternal: () => {}, locationPathname: location.pathname }),
    [navigate, location.pathname]
  );
  const menu = (
    <nav aria-label={`${label} ${copy.navigation}`} className="space-y-5 p-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.defaultLabel}
          </p>
          {group.items.map((item) => (
            <Button
              key={item.id}
              variant={
                location.pathname === item.route ||
                (!item.exact && location.pathname.startsWith(`${item.route}/`))
                  ? "secondary"
                  : "ghost"
              }
              className="min-h-11 w-full justify-start"
              asChild
            >
              <NavLink
                to={scopedRoute(item.route)}
                end={item.exact}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  ) {
                    return;
                  }
                  event.preventDefault();
                  go(item.route);
                }}
              >
                {item.label}
              </NavLink>
            </Button>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <CommandPaletteProvider
      key={namespace}
      commandContext={commandContext}
      initialCommands={commands}
      initialNamespace={namespace}
      labels={copy.palette}
    >
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <a href="#focused-content" className="sr-only focus:not-sr-only">
          {label}
        </a>
        <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={copy.navigation}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(85vw,20rem)] p-0 pt-8">
              <SheetTitle className="px-7">{label}</SheetTitle>
              <SheetDescription className="sr-only">{copy.navigation}</SheetDescription>
              {menu}
            </SheetContent>
          </Sheet>
          <AppSwitcher
            app={app}
            workspaceId={workspace.id}
            apps={ready ? (launches.data ?? []) : []}
            locale={locale}
            loading={ready && (launches.isPending || launching)}
            error={launches.isError || launchError}
            onRetry={() => {
              setLaunchError(false);
              if (ready) {
                void launches.refetch();
              }
            }}
            onLaunch={(id) => {
              void launch(id);
            }}
          />
          <span className="text-lg font-semibold">{label}</span>
          <div className="ml-auto sm:ml-0 sm:order-last">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={copy.account}>
                  <UserRound className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
                <p className="truncate px-2 py-2 text-sm">
                  {state.status === "authenticated" ? state.session.user.name : ""}
                </p>
                <DropdownMenuItem
                  className="min-h-11"
                  onSelect={() =>
                    guard(() => {
                      void logout();
                    })
                  }
                >
                  {copy.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex basis-full flex-wrap items-center justify-between gap-2 sm:ml-auto sm:basis-auto">
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <span className="sr-only">{copy.workspace}</span>
              <select
                className="min-h-11 max-w-[10rem] rounded-md border bg-background px-2 sm:max-w-[14rem]"
                value={workspace.id}
                disabled={!onWorkspaceChange || !workspaces?.length}
                onChange={(event) => {
                  const id = event.target.value;
                  if (workspaces?.some((entry) => entry.id === id)) {
                    const action = () => onWorkspaceChange?.(id);
                    if (routerGuardActive) {
                      action();
                    } else {
                      guard(action);
                    }
                  }
                }}
              >
                {(workspaces?.length ? workspaces : [workspace]).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              disabled={!allAppsUrl}
              onClick={() =>
                guard(() => {
                  if (allAppsUrl) {
                    leavePage(allAppsUrl);
                  }
                })
              }
            >
              <Grid2X2 className="mr-2 h-4 w-4" />
              {copy.allApps}
            </Button>
            <PaletteControls commands={commands} label={copy.search} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-sidebar lg:block">
            {menu}
          </aside>
          <main
            id="focused-content"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-auto p-4 sm:p-8"
          >
            {!ready || navigation.isError || (navigation.data && !verified) ? (
              <div role="alert" className="space-y-3">
                <p>{copy.error}</p>
                <Button
                  variant="outline"
                  disabled={!ready}
                  onClick={() => {
                    void navigation.refetch();
                  }}
                >
                  {copy.retry}
                </Button>
              </div>
            ) : navigation.isPending ? (
              <p role="status">{copy.loading}</p>
            ) : items.length === 0 ? (
              <p role="status">{copy.empty}</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  {availableActions.map((action) => (
                    <Button key={action.id} onClick={() => go(action.route)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
                {children}
              </>
            )}
          </main>
        </div>
      </div>
      <AlertDialog
        open={pending !== null && pending.context === actionContext}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingWrites ? copy.pendingRequest : copy.leaveDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)}>{copy.stay}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingWrites > 0}
              onClick={() => {
                const decision = pending;
                setPending(null);
                if (decision?.context === actionContext) {
                  decision.action();
                }
              }}
            >
              {copy.leave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommandPaletteProvider>
  );
}
