import React, { useCallback, useMemo, useRef, useState } from "react";
import { useBlocker, useBeforeUnload, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isSafeSsoReturnPath, type SsoAppKey } from "@corely/contracts";
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
} from "@corely/ui";
import { SessionProviders, type SessionProvidersProps } from "./session-provider";
import { useSession } from "./session-context";
import { discoverSessionWorkspaces } from "./workspace-discovery";
import { readWorkspaceHint } from "./workspace-launch";
import { WorkspaceAccessGate, WorkspacePicker } from "./workspace-access-gate";
import { workspaceSessionCopy } from "./workspace-session-copy";
import { SessionStatus } from "./session-status";

export interface WorkspaceSessionProvidersProps {
  appKey: SsoAppKey;
  /** Local app-owned landing route used after an explicit workspace selection. */
  homePath?: string;
  locale?: "en" | "de" | "vi";
  retireLegacyStorage?: boolean;
  fetchFn?: typeof fetch;
  navigateToLogin?: SessionProvidersProps["navigate"];
  children: React.ReactNode;
}
const browserFetch: typeof fetch = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => fetch(input, init);

function WorkspaceSelection({
  appKey,
  homePath = "/",
  locale = "en",
  fetchFn = browserFetch,
  navigateToLogin,
  children,
}: WorkspaceSessionProvidersProps) {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const copy = workspaceSessionCopy[locale];
  const hint = readWorkspaceHint(location.search);
  const [drafts, setDrafts] = useState<Set<string>>(() => new Set());
  const [pendingWrites, setPendingWrites] = useState(0);
  const permittedUnload = useRef(false);
  const confirmExternalNavigation = useCallback(
    (action: () => void) => {
      if (pendingWrites) {
        return;
      }
      permittedUnload.current = true;
      action();
    },
    [pendingWrites]
  );
  const registerDraft = useCallback(
    (id: string, dirty: boolean) =>
      setDrafts((previous) => {
        if (previous.has(id) === dirty) {
          return previous;
        }
        const next = new Set(previous);
        if (dirty) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      }),
    []
  );
  const user = session.state.status === "authenticated" ? session.state.session.user : undefined;
  const tenants = user?.memberships
    .map((entry) => entry.tenantId)
    .sort()
    .join(",");
  const discovery = useQuery({
    queryKey: ["session-workspace-discovery", user?.userId, appKey, tenants],
    queryFn: ({ signal }) => {
      if (session.state.status !== "authenticated") {
        throw new Error("Session not ready");
      }
      return discoverSessionWorkspaces(session.state.session, appKey, fetchFn, signal);
    },
    enabled: Boolean(user),
    retry: false,
  });
  const choices = discovery.isError ? [] : (discovery.data ?? []);
  const matches =
    hint.kind === "requested" ? choices.filter((entry) => entry.id === hint.workspaceId) : [];
  const workspace = matches.length === 1 ? matches[0] : undefined;
  const selectWorkspace = useCallback(
    (id: string) => {
      if (choices.filter((entry) => entry.id === id).length !== 1) {
        return;
      }
      // Only the validated workspace ID crosses the URL. Tenant is rediscovered on arrival.
      const search = new URLSearchParams({ workspaceId: id });
      navigate({ pathname: homePath, search: `?${search}` });
    },
    [choices, homePath, navigate]
  );
  const hasUnsavedChanges = drafts.size > 0;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (hasUnsavedChanges || pendingWrites > 0) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (permittedUnload.current) {
          permittedUnload.current = false;
          return;
        }
        if (hasUnsavedChanges || pendingWrites > 0) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [hasUnsavedChanges, pendingWrites]
    )
  );
  const config = useMemo(
    () => ({ appKey, tenantId: workspace?.tenantId, workspaceId: workspace?.id, locale }),
    [appKey, workspace?.tenantId, workspace?.id, locale]
  );
  const picker = <WorkspacePicker choices={choices} select={selectWorkspace} locale={locale} />;
  return (
    <>
      {discovery.isPending ? (
        <p role="status" className="p-6">
          {copy.loading}
        </p>
      ) : discovery.isError ? (
        <section className="p-6" role="alert">
          <p>{copy.error}</p>
          <Button
            onClick={() => {
              void session.retry();
            }}
          >
            {copy.retry}
          </Button>
        </section>
      ) : !workspace ? (
        <section className="space-y-4 p-6">
          <p role={hint.kind === "absent" ? "status" : "alert"}>
            {hint.kind === "absent"
              ? choices.length
                ? copy.choose
                : copy.empty
              : copy.unavailable}
          </p>
          {picker}
        </section>
      ) : (
        <SessionProviders
          key={`${user?.userId}:${workspace.tenantId}:${workspace.id}`}
          config={config}
          fetchFn={fetchFn}
          navigate={navigateToLogin}
          fallback={(value) => (
            <>
              <SessionStatus value={value} locale={locale} />
              <Button
                onClick={() => {
                  void session.retry();
                  navigate({ pathname: homePath, search: "" });
                }}
              >
                {copy.choose}
              </Button>
            </>
          )}
        >
          <WorkspaceAccessGate
            expectedUserId={user?.userId ?? ""}
            onAccountMismatch={session.retry}
            appKey={appKey}
            workspace={workspace}
            choices={choices}
            selectWorkspace={selectWorkspace}
            locale={locale}
            hasUnsavedChanges={hasUnsavedChanges}
            pendingWrites={pendingWrites}
            registerDraft={registerDraft}
            reportWrites={setPendingWrites}
            confirmExternalNavigation={confirmExternalNavigation}
          >
            {children}
          </WorkspaceAccessGate>
        </SessionProviders>
      )}
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-lg"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            blocker.reset?.();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingWrites ? copy.pending : copy.dirty}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>{copy.stay}</AlertDialogCancel>
            <AlertDialogAction disabled={pendingWrites > 0} onClick={() => blocker.proceed?.()}>
              {copy.leave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Mount as a data-router route element. Workspace intent is per-tab URL state, never a global store. */
export function WorkspaceSessionProviders(props: WorkspaceSessionProvidersProps) {
  if (props.homePath && (!isSafeSsoReturnPath(props.homePath) || /[?#]/.test(props.homePath))) {
    throw new Error("Workspace homePath must be a local app route");
  }
  return (
    <SessionProviders
      config={{
        appKey: props.appKey,
        locale: props.locale,
        retireLegacyStorage: props.retireLegacyStorage,
      }}
      fetchFn={props.fetchFn ?? browserFetch}
      navigate={props.navigateToLogin}
    >
      <WorkspaceSelection {...props} />
    </SessionProviders>
  );
}
