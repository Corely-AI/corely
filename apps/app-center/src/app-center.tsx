import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppCatalogItemSchema, AppManagementLinkSchema, type AppLaunchId } from "@corely/contracts";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@corely/ui";
import { useSession } from "@corely/web-shared/session/session-context";
import { useWorkspaceSession } from "@corely/web-shared/session/workspace-session-context";
import { sessionScopeQueryKey } from "@corely/web-shared/session/workspace-launch";
import { catalogLaunchUrl } from "@corely/web-shared/layout/focused-shell-navigation";
import { AppDirectory } from "./app-directory";
import { copy, type Locale } from "./copy";

export function AppCenter({ locale }: { locale: Locale }) {
  const { client, state, logout } = useSession();
  const { scope, workspace, workspaces, selectWorkspace, confirmExternalNavigation } =
    useWorkspaceSession();
  const text = copy[locale];
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const launches = useQuery({
    queryKey: sessionScopeQueryKey(scope, "app-center-directory"),
    queryFn: ({ signal }) =>
      client.json("/menu/launches", z.array(AppCatalogItemSchema), { signal }),
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  const management = useQuery({
    queryKey: sessionScopeQueryKey(scope, "app-management-link"),
    queryFn: ({ signal }) =>
      client.json("/menu/app-management", AppManagementLinkSchema, { signal }),
    retry: false,
    refetchOnWindowFocus: "always",
  });
  const launch = async (id: AppLaunchId) => {
    if (launching) {
      return;
    }
    setLaunching(true);
    setLaunchError(false);
    // Recheck grants/availability before leaving. The destination validates workspace authority again.
    const result = await launches.refetch();
    if (!mounted.current) {
      return;
    }
    const target = !result.isError && result.data?.find((app) => app.launch?.launchId === id);
    const url = target ? catalogLaunchUrl(target, workspace.id) : undefined;
    setLaunching(false);
    if (url) {
      confirmExternalNavigation(() => window.location.assign(url));
    } else {
      setLaunchError(true);
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#apps" className="sr-only focus:not-sr-only">
        {text.skip}
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
          <span className="text-xl font-semibold tracking-tight">
            Corely <span className="font-normal text-muted-foreground">/ {text.title}</span>
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <label className="min-w-0">
              <span className="sr-only">{text.workspace}</span>
              <select
                className="min-h-11 max-w-[11rem] rounded-md border bg-background px-3 sm:max-w-xs"
                value={workspace.id}
                onChange={(event) => selectWorkspace(event.target.value)}
              >
                {workspaces.map((entry) => (
                  <option key={`${entry.tenantId}:${entry.id}`} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-h-11">
                  {text.account}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
                <p className="truncate px-2 py-2 text-sm">
                  {state.status === "authenticated" ? state.session.user.name : ""}
                </p>
                <DropdownMenuItem
                  className="min-h-11"
                  onSelect={() => {
                    void logout();
                  }}
                >
                  {text.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main
        id="apps"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8 sm:py-14"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{workspace.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{text.intro}</h1>
          <p className="text-muted-foreground">{text.subtitle}</p>
          {management.data?.path && !management.isError && (
            <Button
              variant="outline"
              onClick={() => {
                const path = management.data?.path;
                if (path) {
                  confirmExternalNavigation(() => window.location.assign(path));
                }
              }}
            >
              {text.manage}
            </Button>
          )}
          <p className="text-sm text-muted-foreground">{text.accessNote}</p>
        </div>
        <AppDirectory
          apps={launches.data ?? []}
          workspaceId={workspace.id}
          locale={locale}
          loading={launches.isPending}
          error={launches.isError}
          launching={launching}
          launchError={launchError}
          onRetry={() => {
            setLaunchError(false);
            void launches.refetch();
          }}
          onLaunch={(id) => {
            void launch(id);
          }}
        />
      </main>
    </div>
  );
}
