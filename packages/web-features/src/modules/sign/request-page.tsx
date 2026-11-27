import { LoadingSkeleton, Badge, Button, EmptyState, Input } from "@corely/ui";
import { CrudListPageLayout } from "@corely/web-shared/shared/crud/CrudListPageLayout";
import { getIconByName } from "@corely/web-shared/shared/utils/iconMapping";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  SignCeremonyStatusSchema,
  SignRequestListSchema,
  SignRequestDraftSchema,
  type SignRequestDraft,
} from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { RequestActions } from "./request-actions";
export default function RequestPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [params] = useSearchParams();
  if (!activeWorkspaceId || !user?.activeTenantId) {
    return null;
  }
  if (!id) {
    return (
      <DraftList
        key={JSON.stringify([
          user.userId,
          user.activeTenantId,
          activeWorkspaceId,
          params.toString(),
        ])}
        workspace={activeWorkspaceId}
        query={params.toString()}
      />
    );
  }
  return (
    <Detail
      key={JSON.stringify([id, user.userId, user.activeTenantId, activeWorkspaceId])}
      id={id}
      workspace={activeWorkspaceId}
    />
  );
}
function Detail({ id, workspace }: { id: string; workspace: string }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SignRequestDraft>(),
    [error, setError] = useState(""),
    [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void apiClient
      .request(
        "/sign/requests/" + id,
        { headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((value) => {
        if (!controller.signal.aborted) {
          setDraft(SignRequestDraftSchema.parse(value));
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : t("sign.saveFailed"));
        }
      });
    return () => controller.abort();
  }, [workspace, id, attempt, t]);
  if (error) {
    return (
      <section className="space-y-3 p-6">
        <p role="alert">{error}</p>
        <Button variant="outline" onClick={() => retry(attempt + 1)}>
          {t("sign.retry")}
        </Button>
      </section>
    );
  }
  if (!draft) {
    return (
      <LoadingSkeleton
        label={t("sign.loadingRequest")}
        variant="detail"
        className="p-4 sm:p-6 lg:p-8"
        withHeading
      />
    );
  }
  return (
    <section className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="break-words text-h1 text-foreground">{draft.title}</h1>

      <p>
        {t("sign.revision", { revision: draft.templateRevision })} · {t("sign." + draft.routing)}
      </p>
      <ol className="list-inside list-decimal rounded border p-4">
        {draft.recipients.map((r) => (
          <li key={r.roleId}>
            {r.name} ({r.email})
          </li>
        ))}
      </ol>
      <RequestActions workspace={workspace} draft={draft} />
    </section>
  );
}

function DraftList({ workspace, query }: { workspace: string; query: string }) {
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(params.get("q") ?? "");
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.delete("cursor");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next);
  }
  const { t } = useTranslation();
  const [page, setPage] = useState<ReturnType<typeof SignRequestListSchema.parse>>();
  const [error, setError] = useState("");
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void apiClient
      .request(
        "/sign/requests" + (query ? "?" + query : ""),
        { headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((value) => {
        if (!controller.signal.aborted) {
          setPage(SignRequestListSchema.parse(value));
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : t("sign.saveFailed"));
        }
      });
    return () => controller.abort();
  }, [workspace, query, attempt, t]);
  return (
    <CrudListPageLayout
      title={t("sign.requests")}
      primaryAction={
        <Button variant="accent" asChild>
          <Link to="/sign/requests/new">{t("sign.prepareRequest")}</Link>
        </Button>
      }
      toolbar={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            filter("q", term);
          }}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap"
        >
          <label className="grid gap-1 text-sm font-medium">
            {t("sign.search")}{" "}
            <Input
              type="search"
              maxLength={80}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>
          <Button variant="outline" type="submit">
            {t("sign.search")}
          </Button>
          <label className="col-span-2 grid gap-1 text-sm font-medium">
            {t("sign.statusLabel")}{" "}
            <select
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={params.get("status") ?? ""}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">{t("sign.all")}</option>
              {SignCeremonyStatusSchema.options.map((s) => (
                <option key={s} value={s}>
                  {t("sign.states." + s)}
                </option>
              ))}
            </select>
          </label>
        </form>
      }
    >
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-destructive">
          {error}{" "}
          <Button variant="outline" onClick={() => retry(attempt + 1)}>
            {t("sign.retry")}
          </Button>
        </div>
      ) : !page ? (
        <LoadingSkeleton label={t("sign.loadingRequest")} variant="list" className="p-4" />
      ) : (
        <>
          {page.items.length === 0 ? (
            <EmptyState icon={getIconByName("FileSignature")} title={t("sign.noRequests")} />
          ) : (
            <ul className="divide-y divide-border">
              {page.items.map((row) => (
                <li
                  key={row.requestId}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      className="break-all font-medium hover:underline"
                      to={"/sign/requests/" + row.requestId}
                    >
                      {row.title}
                    </Link>
                    <Badge variant="secondary">{t("sign.states." + row.status)}</Badge>
                  </div>
                  <span>{t("sign.revision", { revision: row.templateRevision })}</span>
                </li>
              ))}
            </ul>
          )}
          {page.nextCursor && (
            <Link
              to={
                "?" +
                new URLSearchParams({
                  ...Object.fromEntries(params),
                  cursor: page.nextCursor,
                }).toString()
              }
            >
              {t("sign.nextPage")}
            </Link>
          )}
        </>
      )}
    </CrudListPageLayout>
  );
}
