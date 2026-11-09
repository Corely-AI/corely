import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppCatalogItemSchema, WorkspaceConfigSchema, type AppLaunchId } from "@corely/contracts";
import { useSession } from "../session/session-context";
import { sessionScopeQueryKey } from "../session/workspace-launch";

export function useFocusedShellData(app: AppLaunchId, workspaceId: string) {
  const { client, state } = useSession();
  // The owning client must bind SessionProviders to the selected scope first.
  const ready =
    state.status === "authenticated" &&
    state.session.appKey === app &&
    client.config.workspaceId === workspaceId &&
    Boolean(client.config.tenantId);
  const userId = state.status === "authenticated" ? state.session.user.userId : null;
  const scope = {
    userId: userId ?? "",
    tenantId: client.config.tenantId ?? "",
    workspaceId,
    appKey: app,
  };
  const navigation = useQuery({
    queryKey: sessionScopeQueryKey(scope, "focused-shell-navigation"),
    queryFn: ({ signal }) =>
      client.json(
        `/workspaces/${encodeURIComponent(workspaceId)}/config?scope=web&launchId=${app}`,
        WorkspaceConfigSchema,
        { signal }
      ),
    enabled: ready,
    retry: false,
  });
  const launches = useQuery({
    queryKey: sessionScopeQueryKey(scope, "focused-shell-launches"),
    queryFn: ({ signal }) =>
      client.json("/menu/launches", z.array(AppCatalogItemSchema), { signal }),
    enabled: ready,
    retry: false,
  });
  return { ready, navigation, launches };
}
