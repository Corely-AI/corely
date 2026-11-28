import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, CardContent, LoadingSkeleton } from "@corely/ui";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { createRequestsClient } from "./operational-requests-api";
import { RequestForm } from "./request-form";
import { RequestRouting } from "./request-routing";
import { kindLabel } from "./request-draft-fields";
import { formatDate, statusLabel, statusOf, useRequestsCopy } from "./requests-copy";

type View = "list" | "create" | "detail" | "routing";
export function OperationalRequestsPage({ view = "list" }: { view?: View }) {
  const { id } = useParams<{ id?: string }>();
  const { activeWorkspaceId, isInitialLoading } = useWorkspace();
  const { user } = useAuth();
  const { copy } = useRequestsCopy();
  if (!activeWorkspaceId || !user?.userId) {
    return isInitialLoading ? (
      <LoadingSkeleton className="p-6" variant="list" label={copy.load} withHeading />
    ) : (
      <p className="p-6" role="alert">
        {copy.denied}
      </p>
    );
  }
  const scope = [user.activeTenantId, activeWorkspaceId, user.userId];
  return (
    <RequestsView
      key={JSON.stringify([scope, view, id])}
      scope={scope}
      view={view}
      id={id}
      workspaceId={activeWorkspaceId}
    />
  );
}

function RequestsView({
  scope,
  view,
  id,
  workspaceId,
}: {
  scope: readonly unknown[];
  view: View;
  id: string | undefined;
  workspaceId: string;
}) {
  const { locale, copy } = useRequestsCopy();
  const [page, setPage] = useState(1);
  const requestsApi = useMemo(() => createRequestsClient(workspaceId), [workspaceId]);
  const list = useQuery({
    queryKey: ["operational-requests", ...scope, "list", page],
    queryFn: ({ signal }) => requestsApi.list(page, signal),
    meta: { persist: false },
  });
  const record = useQuery({
    queryKey: ["operational-requests", ...scope, "request", id],
    queryFn: ({ signal }) => requestsApi.get(id ?? "", signal),
    enabled: view === "detail" && Boolean(id),
    meta: { persist: false },
  });
  const permission = list.data;
  const unavailable = list.error ?? record.error;
  const title =
    view === "routing"
      ? copy.routing
      : view === "create"
        ? copy.newRequest
        : record.data
          ? kindLabel(record.data.kind, copy)
          : copy.title;
  return (
    <section
      className="mx-auto w-full max-w-4xl space-y-6 p-4 pt-6 sm:p-8"
      aria-labelledby="requests-title"
    >
      {view !== "list" && (
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          to="/requests"
        >
          {copy.back}
        </Link>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 id="requests-title" className="text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          {view === "list" && <p className="text-sm text-muted-foreground">{copy.description}</p>}
        </div>
        {view === "list" && (
          <div className="flex flex-wrap gap-2">
            {permission?.canManageRouting && (
              <Button variant="outline" asChild>
                <Link to="/requests/routing">{copy.routing}</Link>
              </Button>
            )}
            {permission?.canSubmit && (
              <Button asChild>
                <Link to="/requests/new">{copy.newRequest}</Link>
              </Button>
            )}
          </div>
        )}
      </header>
      {unavailable ? (
        <div className="space-y-3" role="alert">
          <p>{[401, 403, 404].includes(statusOf(unavailable)) ? copy.denied : copy.error}</p>
          <Button
            variant="outline"
            onClick={() => {
              void list.refetch();
              if (view === "detail") {
                void record.refetch();
              }
            }}
          >
            {copy.retry}
          </Button>
        </div>
      ) : list.isPending || (view === "detail" && record.isPending) ? (
        <LoadingSkeleton variant={view === "list" ? "list" : "form"} label={copy.load} />
      ) : view === "list" && permission ? (
        <>
          <Card>
            <CardContent className="p-0">
              {permission.items.length ? (
                <ul className="divide-y divide-border" aria-label={copy.title}>
                  {permission.items.map((request) => (
                    <li key={request.id}>
                      <Link
                        to={`/requests/${request.id}`}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-3 sm:px-6"
                      >
                        <span className="font-medium">{kindLabel(request.kind, copy)}</span>
                        <Badge
                          variant={request.status === "SUBMITTED" ? "default" : "secondary"}
                          className="w-fit"
                        >
                          {statusLabel(request.status, copy)}
                        </Badge>
                        <time
                          className="col-span-2 text-sm text-muted-foreground sm:col-span-1 sm:justify-self-end"
                          dateTime={request.updatedAt}
                        >
                          {formatDate(request.updatedAt, locale)}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">{copy.empty}</p>
              )}
            </CardContent>
          </Card>
          {(page > 1 || permission.hasMore) && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>
                {copy.previous}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={!permission.hasMore}
              >
                {copy.next}
              </Button>
            </div>
          )}
        </>
      ) : view === "routing" && permission?.canManageRouting ? (
        <RequestRouting
          requestsApi={requestsApi}
          workspaceId={workspaceId}
          scope={scope}
          copy={copy}
        />
      ) : (view === "create" && permission?.canSubmit) || (view === "detail" && record.data) ? (
        <RequestForm
          requestsApi={requestsApi}
          scope={scope}
          record={record.data}
          copy={copy}
          locale={locale}
          canSubmit={Boolean(permission?.canSubmit)}
          onReload={async () => (await record.refetch()).data}
        />
      ) : (
        <p role="alert">{copy.denied}</p>
      )}
    </section>
  );
}
