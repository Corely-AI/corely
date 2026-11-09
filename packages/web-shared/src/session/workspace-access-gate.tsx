import React, { useLayoutEffect, useSyncExternalStore } from "react";
import { useIsMutating, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppCatalogItemSchema, WorkspaceConfigSchema, type SsoAppKey } from "@corely/contracts";
import { Button } from "@corely/ui";
import { useSession } from "./session-context";
import { sessionScopeQueryKey } from "./workspace-launch";
import {
  WorkspaceSessionContext,
  type WorkspaceSessionContextValue,
} from "./workspace-session-context";
import type { SessionWorkspaceChoice } from "./workspace-discovery";
import { workspaceSessionCopy } from "./workspace-session-copy";

export function WorkspacePicker({
  choices,
  select,
  locale,
}: {
  choices: SessionWorkspaceChoice[];
  select: (id: string) => void;
  locale: "en" | "de" | "vi";
}) {
  return (
    <nav aria-label={workspaceSessionCopy[locale].choose} className="flex flex-wrap gap-3 p-6">
      {choices.map((entry) => (
        <Button
          key={`${entry.tenantId}:${entry.id}`}
          variant="outline"
          onClick={() => select(entry.id)}
        >
          {entry.tenantName} · {entry.name}
        </Button>
      ))}
    </nav>
  );
}

export function WorkspaceAccessGate({
  appKey,
  workspace,
  choices,
  selectWorkspace,
  locale,
  hasUnsavedChanges,
  pendingWrites,
  registerDraft,
  reportWrites,
  confirmExternalNavigation,
  expectedUserId,
  onAccountMismatch,
  children,
}: {
  appKey: SsoAppKey;
  workspace: SessionWorkspaceChoice;
  choices: SessionWorkspaceChoice[];
  selectWorkspace: (id: string) => void;
  locale: "en" | "de" | "vi";
  hasUnsavedChanges: boolean;
  pendingWrites: number;
  registerDraft: WorkspaceSessionContextValue["registerDraft"];
  reportWrites: (count: number) => void;
  confirmExternalNavigation: WorkspaceSessionContextValue["confirmExternalNavigation"];
  children: React.ReactNode;
  expectedUserId: string;
  onAccountMismatch: () => Promise<void>;
}) {
  const { client, state } = useSession();
  const scope = {
    appKey,
    tenantId: workspace.tenantId,
    workspaceId: workspace.id,
    userId: state.status === "authenticated" ? state.session.user.userId : "",
  };
  const transportCount = useSyncExternalStore(
    client.subscribePendingCommands,
    client.getPendingCommands,
    client.getPendingCommands
  );
  const count = Math.max(useIsMutating(), transportCount);
  const sameAccount =
    state.status === "authenticated" && state.session.user.userId === expectedUserId;
  useLayoutEffect(() => {
    if (!sameAccount) {
      void onAccountMismatch();
    }
  }, [sameAccount, onAccountMismatch]);
  useLayoutEffect(() => {
    reportWrites(count);
    return () => reportWrites(0);
  }, [count, reportWrites]);
  const access = useQuery({
    queryKey: sessionScopeQueryKey(scope, "workspace-authority"),
    queryFn: async ({ signal }) => {
      if (appKey === "app-center") {
        await client.json("/menu/launches", z.array(AppCatalogItemSchema), { signal });
        return true;
      }
      const config = await client.json(
        `/workspaces/${encodeURIComponent(workspace.id)}/config?scope=web&launchId=${appKey}`,
        WorkspaceConfigSchema,
        { signal }
      );
      return (
        config.workspaceId === workspace.id &&
        config.launchId === appKey &&
        config.navigation.groups.some((group) => group.items.length > 0)
      );
    },
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    enabled: sameAccount,
  });
  const copy = workspaceSessionCopy[locale];
  if (!sameAccount || access.isPending) {
    return (
      <p role="status" className="p-6">
        {copy.loading}
      </p>
    );
  }
  if (access.isError || !access.data) {
    return (
      <section className="space-y-4 p-6">
        <p role="alert">{access.isError ? copy.error : copy.appUnavailable}</p>
        <Button
          onClick={() => {
            void access.refetch();
          }}
        >
          {copy.retry}
        </Button>
        <WorkspacePicker choices={choices} select={selectWorkspace} locale={locale} />
      </section>
    );
  }
  return (
    <WorkspaceSessionContext.Provider
      value={{
        workspace,
        workspaces: choices,
        scope,
        selectWorkspace,
        hasUnsavedChanges,
        pendingWrites,
        registerDraft,
        confirmExternalNavigation,
      }}
    >
      {children}
    </WorkspaceSessionContext.Provider>
  );
}
