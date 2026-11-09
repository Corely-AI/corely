import {
  AppLaunchOriginSchema,
  isSafeSsoReturnPath,
  type AppCatalogItem,
  type AppLaunchId,
  type WorkspaceConfig,
  type WorkspaceNavigationItem,
} from "@corely/contracts";

export interface FocusedShellAction {
  id: string;
  label: string;
  route: string;
  /** A granted server menu contribution that owns this action. */
  menuItemId: string;
}

export function isFocusedRoute(route: string, routeRoots: readonly string[]): boolean {
  if (!isSafeSsoReturnPath(route)) {
    return false;
  }
  const pathname = new URL(route, "https://local.invalid").pathname;
  return routeRoots.some(
    (root) =>
      root !== "/" &&
      isSafeSsoReturnPath(root) &&
      new URL(root, "https://local.invalid").pathname === root &&
      (pathname === root || pathname.startsWith(`${root}/`))
  );
}

/** Fail closed on stale, unscoped or mismatched configuration. */
export function focusedNavigation(
  app: AppLaunchId,
  workspaceId: string,
  config: WorkspaceConfig | undefined,
  routeRoots: readonly string[]
) {
  if (config?.launchId !== app || config.workspaceId !== workspaceId) {
    return [];
  }
  return config.navigation.groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item): item is WorkspaceNavigationItem & { route: string } =>
          typeof item.route === "string" && isFocusedRoute(item.route, routeRoots)
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function focusedActions(
  groups: ReturnType<typeof focusedNavigation>,
  actions: readonly FocusedShellAction[],
  routeRoots: readonly string[]
) {
  const ids = new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
  return actions.filter(
    (action) => ids.has(action.menuItemId) && isFocusedRoute(action.route, routeRoots)
  );
}

/** Accept an exact configured origin only. Workspace is a hint, never authority. */
export function buildWorkspaceLaunchUrl(origin: string, workspaceId: string): string | undefined {
  const parsed = AppLaunchOriginSchema.safeParse(origin);
  if (!parsed.success || !workspaceId) {
    return undefined;
  }
  const url = new URL(parsed.data);
  url.searchParams.set("workspaceId", workspaceId);
  return url.href;
}

export function catalogLaunchUrl(app: AppCatalogItem, workspaceId: string): string | undefined {
  const launch = app.launch;
  return app.enabled && launch?.availability === "available" && launch.url
    ? buildWorkspaceLaunchUrl(launch.url, workspaceId)
    : undefined;
}
