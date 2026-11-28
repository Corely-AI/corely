import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button, LoadingSkeleton } from "@corely/ui";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { createRequestsClient } from "./operational-requests-api";
import { RequestForm } from "./request-form";
import { RequestRouting } from "./request-routing";
import {
  OperationalRequestQueueStatusSchema,
  type OperationalRequestQueueStatus,
} from "@corely/contracts";
import { RequestQueue } from "./request-queue";
import { kindLabel } from "./request-draft-fields";
import { statusOf, useRequestsCopy } from "./requests-copy";

type View = "list" | "inbox" | "create" | "detail" | "routing";
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
  const [filter, setFilter] = useState<OperationalRequestQueueStatus>();
  const location = useLocation();
  const isQueue = view === "list" || view === "inbox";
  const inbox = view === "inbox";
  const fromInbox = view === "detail" && location.state?.fromInbox === true;
  const requestsApi = useMemo(() => createRequestsClient(workspaceId), [workspaceId]);
  const list = useQuery({
    queryKey: ["operational-requests", ...scope, "list", inbox, page, filter],
    queryFn: ({ signal }) => requestsApi.list(page, signal, filter, inbox),
    retry: (count, error) => statusOf(error) >= 500 && count < 1,
    meta: { persist: false },
  });
  const record = useQuery({
    queryKey: ["operational-requests", ...scope, "request", id],
    queryFn: ({ signal }) => requestsApi.get(id ?? "", signal),
    enabled: view === "detail" && Boolean(id),
    meta: { persist: false },
  });
  const permission = list.error ? undefined : list.data;
  const unavailable = list.error ?? record.error;
  const title = inbox
    ? copy.inbox
    : view === "list"
      ? copy.myRequests
      : view === "routing"
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
          to={fromInbox ? "/requests/inbox" : "/requests"}
        >
          {fromInbox ? copy.backInbox : copy.back}
        </Link>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 id="requests-title" className="text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          {isQueue && (
            <p className="text-sm text-muted-foreground">
              {inbox ? copy.inboxDescription : copy.description}
            </p>
          )}
        </div>
        {isQueue && (
          <div className="flex flex-wrap gap-2">
            {!inbox && permission?.canReview && (
              <Button variant="outline" asChild>
                <Link to="/requests/inbox">{copy.inbox}</Link>
              </Button>
            )}
            {!inbox && permission?.canManageRouting && (
              <Button variant="outline" asChild>
                <Link to="/requests/routing">{copy.routing}</Link>
              </Button>
            )}
            {!inbox && permission?.canSubmit && (
              <Button asChild>
                <Link to="/requests/new">{copy.newRequest}</Link>
              </Button>
            )}
          </div>
        )}
      </header>
      {unavailable ? (
        <div className="space-y-3" role="alert">
          <p>
            {[401, 403, 404].includes(statusOf(unavailable))
              ? copy.denied
              : statusOf(unavailable) >= 500
                ? copy.sourceError
                : copy.error}
          </p>
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
        <LoadingSkeleton variant={isQueue ? "list" : "form"} label={copy.load} />
      ) : isQueue && permission ? (
        <RequestQueue
          result={permission}
          inbox={inbox}
          copy={copy}
          locale={locale}
          page={page}
          filter={filter}
          refreshing={list.isFetching}
          onRefresh={() => void list.refetch()}
          onFilter={(selection) => {
            const parsed = OperationalRequestQueueStatusSchema.safeParse(selection);
            setFilter(parsed.success ? parsed.data : undefined);
            setPage(1);
          }}
          onPage={setPage}
        />
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
