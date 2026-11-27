import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  EmptyState,
  LoadingSkeleton,
  Skeleton,
} from "@corely/ui";
import type { ProcedureFields, UpdateProcedure } from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { createProceduresClient, type ProceduresClient } from "./procedures-client";
import { knowledgeCopy, type KnowledgeCopy } from "./knowledge-copy";
import { ProcedureForm } from "./procedure-form";

type Mode = "list" | "new" | "detail" | "edit";
type ScopeKey = readonly unknown[];
type Action = "publish" | "archive";
type FormValues = Pick<UpdateProcedure, "title" | "reviewDate" | "content">;
type Request = { path: string; method: "POST" | "PATCH"; body: unknown };

function statusCode(error: unknown) {
  return error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
}

function reviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`)
  );
}

function ProcedureState({
  copy,
  error,
  retry,
}: {
  copy: KnowledgeCopy;
  error: unknown;
  retry: () => void;
}) {
  const denied = [401, 403, 404].includes(statusCode(error) ?? 0);
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-border bg-card p-5">
      <p>{denied ? copy.denied : copy.failed}</p>
      {!denied && (
        <Button variant="outline" onClick={retry}>
          {copy.retry}
        </Button>
      )}
    </div>
  );
}

function ProcedureLoading({ copy, list = false }: { copy: KnowledgeCopy; list?: boolean }) {
  return (
    <LoadingSkeleton label={copy.loading} className="rounded-xl border border-border bg-card">
      <div className="divide-y divide-border">
        {Array.from({ length: list ? 4 : 2 }, (_, index) => (
          <div key={index} className="space-y-3 px-5 py-4">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ))}
      </div>
    </LoadingSkeleton>
  );
}

function ProcedureListView({
  client,
  scope,
  copy,
  locale,
  basePath,
}: {
  client: ProceduresClient;
  scope: ScopeKey;
  copy: KnowledgeCopy;
  locale: string;
  basePath: string;
}) {
  const query = useQuery({
    queryKey: [...scope, "list"],
    queryFn: ({ signal }) => client.list(signal),
  });
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{copy.heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        {query.data?.canManage && !query.isError && (
          <Button asChild>
            <Link to={`${basePath}/new`}>{copy.new}</Link>
          </Button>
        )}
      </div>
      {query.isPending ? (
        <ProcedureLoading copy={copy} list />
      ) : query.isError ? (
        <ProcedureState copy={copy} error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState title={copy.none} description={copy.empty} />
        </div>
      ) : (
        <ul
          aria-label={copy.list}
          className="divide-y divide-border rounded-xl border border-border bg-card"
        >
          {query.data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <Link
                  className="break-words font-semibold text-primary underline-offset-4 hover:underline"
                  to={`${basePath}/${item.id}`}
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.ownerName || copy.ownerUnknown} · {copy.review}{" "}
                  {reviewDate(item.reviewDate, locale)}
                  {item.publishedVersion !== null && (
                    <>
                      {" "}
                      · {copy.version} {item.publishedVersion}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{copy[item.status]}</Badge>
                {item.status === "published" && item.hasDraft && (
                  <Badge variant="outline">{copy.pending}</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ContentView({
  fields,
  label,
  id,
  copy,
  client,
}: {
  fields: ProcedureFields;
  label?: string;
  id: string;
  copy: KnowledgeCopy;
  client: ProceduresClient;
}) {
  const { content } = fields;
  const download = useMutation({
    mutationFn: async ({
      fileId,
      filename,
    }: Extract<ProcedureFields["content"], { kind?: "file" }>) => {
      const blob = await client.download(id, fileId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      {label && <h2 className="font-semibold">{label}</h2>}
      {content.kind === "page" && <p className="whitespace-pre-wrap break-words">{content.text}</p>}
      {content.kind === "link" && (
        <a
          className="break-all text-primary underline"
          href={content.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          {copy.open} <span className="block text-sm">{content.url}</span>
        </a>
      )}
      {content.kind === "file" && (
        <>
          <Button
            variant="outline"
            disabled={download.isPending}
            onClick={() => download.mutate(content)}
          >
            <span className="max-w-[min(65vw,32rem)] truncate">
              {copy.download} · {content.filename}
            </span>
          </Button>
          {download.isError && (
            <p role="alert" className="text-destructive">
              {copy.downloadError}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function ProcedureDetailView({
  client,
  scope,
  copy,
  locale,
  basePath,
  mode,
  id,
}: {
  client: ProceduresClient;
  scope: ScopeKey;
  copy: KnowledgeCopy;
  locale: string;
  basePath: string;
  mode: Exclude<Mode, "list">;
  id?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>();
  const lastRequest = useRef<{ signature: string; key: string }>();
  const detailKey = [...scope, "detail", id];
  const detail = useQuery({
    queryKey: detailKey,
    enabled: Boolean(id),
    refetchOnWindowFocus: mode !== "edit",
    queryFn: ({ signal }) => {
      if (!id) {
        throw new Error("Procedure ID required");
      }
      return client.detail(id, signal);
    },
  });
  const creation = useQuery({
    queryKey: [...scope, "list"],
    enabled: mode === "new",
    queryFn: ({ signal }) => client.list(signal),
  });
  const mutation = useMutation({
    mutationFn: (request: Request) => {
      const signature = JSON.stringify(request);
      if (lastRequest.current?.signature !== signature) {
        lastRequest.current = { signature, key: crypto.randomUUID() };
      }
      return client.command(request.path, request.method, request.body, lastRequest.current.key);
    },
    onSuccess: (record) => {
      lastRequest.current = undefined;
      queryClient.setQueryData([...scope, "detail", record.id], record);
      void queryClient.invalidateQueries({ queryKey: [...scope, "list"] });
      setAction(undefined);
      if (mode !== "detail") {
        navigate(`${basePath}/${record.id}`, { replace: true });
      }
    },
  });
  const record = detail.data;
  const title = mode === "new" ? copy.new : copy.heading;
  const displayed = record?.draft ?? record?.published;
  const back = (
    <Link className="text-sm text-primary underline" to={basePath}>
      {copy.list}
    </Link>
  );
  const active = mode === "new" ? creation : detail;
  const hasConflict = statusCode(mutation.error) === 409;
  const actionError = mutation.isError && (
    <p role="alert" className="text-sm text-destructive">
      {hasConflict ? copy.conflict : copy.changeFailed}
      {hasConflict && (
        <Button
          variant="link"
          onClick={() => {
            mutation.reset();
            void active.refetch();
          }}
        >
          {copy.refresh}
        </Button>
      )}
    </p>
  );

  function save(values: FormValues) {
    const request: Request = record
      ? { method: "PATCH", path: `/${record.id}`, body: { ...values, revision: record.revision } }
      : { method: "POST", path: "", body: values };
    return mutation
      .mutateAsync(request)
      .then(() => undefined)
      .catch(() => undefined);
  }

  return (
    <>
      {back}
      <h1 className="text-2xl font-semibold">
        {mode === "detail" ? (displayed?.title ?? title) : title}
      </h1>
      {active.isPending ? (
        <ProcedureLoading copy={copy} />
      ) : active.isError ? (
        <ProcedureState copy={copy} error={active.error} retry={() => void active.refetch()} />
      ) : mode !== "detail" ? (
        (mode === "new" ? creation.data?.canManage : record?.canManage && !record.archivedAt) ? (
          <>
            {actionError}
            <ProcedureForm
              key={record?.revision ?? "new"}
              copy={copy}
              initial={displayed ?? undefined}
              cancelPath={record ? `${basePath}/${record.id}` : basePath}
              pending={mutation.isPending}
              onSave={save}
            />
          </>
        ) : (
          <p role="alert">{copy.denied}</p>
        )
      ) : record && displayed ? (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{copy.owner}</dt>
              <dd className="break-words">{record.ownerName || copy.ownerUnknown}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{copy.review}</dt>
              <dd>{reviewDate(displayed.reviewDate, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{copy.version}</dt>
              <dd>{record.published?.version ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{copy.status}</dt>
              <dd>
                {record.archivedAt ? copy.archived : record.published ? copy.published : copy.draft}
              </dd>
            </div>
          </dl>
          {record.canManage && !record.archivedAt && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={`${basePath}/${record.id}/edit`}>
                  {record.draft ? copy.edit : copy.start}
                </Link>
              </Button>
              {record.draft && (
                <Button onClick={() => setAction("publish")} disabled={hasConflict}>
                  {copy.publish}
                </Button>
              )}
              <Button variant="outline" onClick={() => setAction("archive")} disabled={hasConflict}>
                {copy.archive}
              </Button>
            </div>
          )}
          {!action && actionError}
          {record.draft && (
            <ContentView
              fields={record.draft}
              label={record.published ? copy.draft : undefined}
              copy={copy}
              client={client}
              id={record.id}
            />
          )}
          {record.published && (
            <ContentView
              fields={record.published}
              label={
                record.draft
                  ? `${record.published.title} · ${copy.published} · ${copy.version} ${record.published.version} · ${copy.review} ${reviewDate(record.published.reviewDate, locale)}`
                  : undefined
              }
              copy={copy}
              client={client}
              id={record.id}
            />
          )}
          <AlertDialog
            open={Boolean(action)}
            onOpenChange={(open) => {
              if (!open && !mutation.isPending) {
                setAction(undefined);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {action === "archive" ? copy.archiveTitle : copy.publishTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {action === "archive" ? copy.archiveDescription : copy.publishDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {actionError}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={mutation.isPending}>{copy.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={mutation.isPending || hasConflict}
                  onClick={(event) => {
                    event.preventDefault();
                    if (action) {
                      mutation.mutate({
                        method: "POST",
                        path: `/${record.id}/${action}`,
                        body: { revision: record.revision },
                      });
                    }
                  }}
                >
                  {mutation.isPending
                    ? copy.saving
                    : action === "archive"
                      ? copy.archive
                      : copy.publish}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </>
  );
}

export function KnowledgePage({
  mode = "list",
  basePath = "/knowledge",
}: {
  mode?: Mode;
  basePath?: string;
}) {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { id } = useParams();
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const copy = knowledgeCopy(locale);
  const client = useMemo(
    () => createProceduresClient(apiClient, activeWorkspaceId ?? ""),
    [activeWorkspaceId]
  );
  const scope = ["knowledge", user?.userId, user?.activeTenantId, activeWorkspaceId] as const;
  return (
    <div
      className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6"
      key={JSON.stringify([...scope, mode, id])}
    >
      {!activeWorkspaceId ? (
        <p role="alert">{copy.denied}</p>
      ) : mode === "list" ? (
        <ProcedureListView
          client={client}
          scope={scope}
          copy={copy}
          locale={locale}
          basePath={basePath}
        />
      ) : (
        <ProcedureDetailView
          client={client}
          scope={scope}
          copy={copy}
          locale={locale}
          basePath={basePath}
          mode={mode}
          id={id}
        />
      )}
    </div>
  );
}
