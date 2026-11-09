import React, { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button, Input } from "@corely/ui";
import { WorkspaceSessionProviders } from "../../src/session/workspace-session-provider";
import {
  useWorkspaceDraftGuard,
  useWorkspaceSession,
} from "../../src/session/workspace-session-context";
import { useSession } from "../../src/session/session-context";
import { sessionScopeQueryKey, buildWorkspaceDeepLink } from "../../src/session/workspace-launch";
import { FocusedAppShell } from "../../src/layout/focused-app-shell";
import {
  fixtureApp,
  fixtureOrigins,
  workspaceFixtureResponse,
  type FixtureUser,
} from "../workspace-api-fixture";
const origins = fixtureOrigins(location.port || "5186");
const query = new URLSearchParams(location.search);
const preview = location.hostname === "127.0.0.1";
const appKey = preview
  ? query.get("app") === "hr" || location.pathname.endsWith("/hr")
    ? "hr"
    : query.get("app") === "app-center" || location.pathname.endsWith("/app-center")
      ? "app-center"
      : "invoice"
  : fixtureApp(location.hostname);
let previewUser: FixtureUser = query.get("user") === "user-b" ? "user-b" : "user-a";
let completeWrite: (() => void) | undefined;
const previewFetch: typeof fetch = async (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => {
  if (init?.method === "POST") {
    await new Promise<void>((resolve) => {
      completeWrite = resolve;
    });
  }
  return workspaceFixtureResponse(
    String(input),
    new Headers(init?.headers),
    previewUser,
    appKey,
    origins
  );
};

function Content() {
  const workspace = useWorkspaceSession();
  const { client } = useSession();
  const [note, setNote] = useState("");
  useWorkspaceDraftGuard(Boolean(note));
  const records = useQuery({
    queryKey: sessionScopeQueryKey(workspace.scope, "fixture-records"),
    queryFn: ({ signal }) =>
      client.json(
        appKey === "hr" ? "/people/staff" : "/invoices",
        z.object({ label: z.string() }),
        { signal }
      ),
    enabled: appKey !== "app-center",
  });
  const save = useMutation({
    mutationFn: () =>
      client.json(
        appKey === "hr" ? "/people/staff" : "/invoices",
        z.object({ label: z.string() }),
        { method: "POST", body: "{}" }
      ),
  });
  const content = (
    <section className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">Synthetic workspace/session review</p>
      <h1 className="text-3xl font-semibold">
        {appKey === "app-center"
          ? "Your apps"
          : appKey === "hr"
            ? "Team workspace"
            : "Invoice workspace"}
      </h1>
      <p className="font-medium">{workspace.workspace.name}</p>
      <p>{records.data?.label}</p>
      <div className="flex flex-wrap gap-3">
        {appKey === "app-center" &&
          (["invoice", "hr"] as const).map((app) => (
            <Button asChild key={app}>
              <a href={buildWorkspaceDeepLink(app, origins, workspace.scope.workspaceId)}>
                {app === "invoice" ? "Invoice" : "HR"}
              </a>
            </Button>
          ))}
      </div>
      {appKey !== "app-center" && (
        <>
          <label className="block max-w-md space-y-2">
            <span>Unsaved note</span>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save fixture change
          </Button>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => workspace.selectWorkspace("workspace-a")}>
          Choose Linden
        </Button>
        <Button variant="outline" onClick={() => workspace.selectWorkspace("workspace-b")}>
          Choose River
        </Button>
      </div>
      {preview && (
        <div className="space-x-2">
          <Button variant="outline" onClick={() => completeWrite?.()}>
            Complete fixture write
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              previewUser = "user-b";
              window.dispatchEvent(new Event("focus"));
            }}
          >
            Use second synthetic account
          </Button>
        </div>
      )}
    </section>
  );
  if (appKey === "app-center") {
    return <main className="p-6">{content}</main>;
  }
  return (
    <FocusedAppShell
      app={appKey}
      label={appKey === "hr" ? "HR" : "Invoice"}
      routeRoots={appKey === "hr" ? ["/people"] : ["/invoices", "/audit"]}
      appCenterOrigin={origins["app-center"]}
      workspace={workspace.workspace}
      workspaces={workspace.workspaces}
      onWorkspaceChange={workspace.selectWorkspace}
      actions={
        appKey === "invoice"
          ? [
              {
                id: "new-invoice",
                label: "New invoice",
                menuItemId: "invoices",
                route: "/invoices/new",
              },
            ]
          : []
      }
      isDirty={Boolean(note)}
    >
      {content}
    </FocusedAppShell>
  );
}
export function WorkspaceSessionFixture() {
  const router = createBrowserRouter([
    {
      path: "*",
      element: (
        <WorkspaceSessionProviders
          appKey={appKey}
          homePath={preview ? `/workspace-session/${appKey}` : "/"}
          fetchFn={preview ? previewFetch : undefined}
        >
          <Content />
        </WorkspaceSessionProviders>
      ),
    },
  ]);
  return <RouterProvider router={router} />;
}
