import { Button, EmptyState } from "@corely/ui";
import { CrudListPageLayout } from "@corely/web-shared/shared/crud/CrudListPageLayout";
import { getIconByName } from "@corely/web-shared/shared/utils/iconMapping";
import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  DraftPdfSchema,
  SignRequestDraftSchema,
  type CreateSignRequestDraft,
  SignPublicationSchema,
  SignDraftSchema,
  SignDraftListSchema,
  type SignDraft,
  type SignDraftSummary,
  type SignLayout,
} from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import TemplateEditor from "./template-editor";

export default function SignTemplatePage() {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const { id } = useParams();
  const { pathname, search } = useLocation();
  if (!activeWorkspaceId || !user?.activeTenantId)
    return <p>Select a workspace to prepare templates.</p>;
  return (
    <WorkspaceTemplates
      key={JSON.stringify([user.userId, user.activeTenantId, activeWorkspaceId, pathname, search])}
      workspace={activeWorkspaceId}
      id={id}
      list={pathname === "/sign/templates"}
      requestMode={pathname === "/sign/requests/new"}
    />
  );
}

export function WorkspaceTemplates({
  workspace,
  id,
  list,
  requestMode = false,
}: {
  workspace: string;
  id?: string;
  list: boolean;
  requestMode?: boolean;
}) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const engagement = params.get("coaching");
  const suffix = engagement ? "?coaching=" + encodeURIComponent(engagement) : "";
  const [cursor] = useState(params.get("cursor"));
  const [templateId] = useState(() => id ?? crypto.randomUUID());
  const [sourceFile, setSourceFile] = useState<File>();
  const [initial, setInitial] = useState<SignDraft>();
  const [items, setItems] = useState<SignDraftSummary[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, retry] = useState(0);
  const revision = useRef(0);
  const pending = useRef<{ content: string; body: string; key: string; saved?: SignDraft }>();
  const endpoint = "/sign/templates";
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function open() {
      setError("");
      setReady(false);
      const options = { workspaceScope: "none" as const, signal: controller.signal };
      const headers = { "X-Workspace-Id": workspace };
      if (id) {
        const draft = SignDraftSchema.parse(
          await apiClient.request(endpoint + "/" + id, { headers }, options)
        );
        const source = DraftPdfSchema.parse(
          await apiClient.request(endpoint + "/" + id + "/source", { headers }, options)
        );
        if (active) {
          if (source.base64)
            setSourceFile(
              new File(
                [Uint8Array.from(atob(source.base64), (char) => char.charCodeAt(0))],
                draft.title + ".pdf",
                { type: "application/pdf" }
              )
            );
          revision.current = draft.revision;
          setInitial(draft);
        }
      } else {
        // Authorize a new editor through the same workspace-scoped query as the list.
        const page = SignDraftListSchema.parse(
          await apiClient.request(
            endpoint + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
            { headers },
            options
          )
        );
        if (active) {
          setItems(page.items);
          setNext(page.nextCursor);
        }
      }
      if (active) setReady(true);
    }
    void open().catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Could not load templates.");
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, workspace, cursor, attempt]);

  async function save(layout: SignLayout, title: string, file: File) {
    const content = JSON.stringify({ title, layout });
    if (pending.current?.content !== content) {
      pending.current = {
        content,
        body: JSON.stringify({ expectedRevision: revision.current, title, layout }),
        key: crypto.randomUUID(),
      };
    }
    const attempt = pending.current;
    const draft =
      attempt.saved ??
      SignDraftSchema.parse(
        await apiClient.request(
          endpoint + "/" + templateId,
          {
            method: "PUT",
            headers: { "X-Workspace-Id": workspace, "Content-Type": "application/json" },
            body: attempt.body,
          },
          { workspaceScope: "none", idempotencyKey: attempt.key }
        )
      );
    attempt.saved = draft;
    revision.current = draft.revision;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read the source PDF."));
      reader.readAsDataURL(file);
    });
    await apiClient.request(
      endpoint + "/" + templateId + "/source",
      {
        method: "PUT",
        headers: { "X-Workspace-Id": workspace, "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      },
      { workspaceScope: "none" }
    );
    pending.current = undefined;
    return draft;
  }
  async function createRequest(input: CreateSignRequestDraft, key: string) {
    return SignRequestDraftSchema.parse(
      await apiClient.request(
        engagement
          ? "/coaching-engagements/" + encodeURIComponent(engagement) + "/sign-requests"
          : "/sign/requests",
        {
          method: "POST",
          headers: { "X-Workspace-Id": workspace, "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        { workspaceScope: "none", idempotencyKey: key }
      )
    );
  }
  async function publish(revision: number) {
    SignPublicationSchema.parse(
      await apiClient.request(
        endpoint + "/" + templateId + "/versions/" + revision,
        { method: "PUT", headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none" }
      )
    );
  }
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState("");
  const archiveKey = useRef<{ target: string; key: string }>();
  async function archive(item: SignDraftSummary) {
    if (!window.confirm("Archive " + item.title + "? Published versions will be retained.")) return;
    setArchiving(item.templateId);
    setArchiveError("");
    try {
      const target = item.templateId + "/" + item.revision;
      if (archiveKey.current?.target !== target)
        archiveKey.current = { target, key: crypto.randomUUID() };
      const updated = SignDraftSchema.parse(
        await apiClient.request(
          endpoint + "/" + item.templateId + "/archive",
          {
            method: "PUT",
            headers: { "X-Workspace-Id": workspace, "Content-Type": "application/json" },
            body: JSON.stringify({ revision: item.revision }),
          },
          { workspaceScope: "none", idempotencyKey: archiveKey.current.key }
        )
      );
      setItems((current) =>
        current.map((row) => (row.templateId === updated.templateId ? updated : row))
      );
      archiveKey.current = undefined;
    } catch (reason) {
      setArchiveError(reason instanceof Error ? reason.message : "Archive failed.");
    } finally {
      setArchiving("");
    }
  }
  if (!list && error)
    return (
      <section className="space-y-3 p-6">
        <p role="alert">{error}</p>
        <Button variant="outline" onClick={() => retry(attempt + 1)}>
          {t("sign.retry")}
        </Button>
      </section>
    );
  if (!list && !ready)
    return (
      <p className="p-6 text-muted-foreground" role="status">
        {t("sign.loading")}
      </p>
    );
  if (!list)
    return (
      <TemplateEditor
        requestMode={requestMode}
        initial={initial}
        sourceFile={sourceFile}
        saveDraft={save}
        publishDraft={publish}
        createRequest={createRequest}
      />
    );
  return (
    <CrudListPageLayout
      title={t("sign.templates")}
      primaryAction={
        <Button variant="accent" asChild>
          <Link to={"/sign/templates/new" + suffix}>{t("sign.newDraft")}</Link>
        </Button>
      }
    >
      {archiveError && (
        <p className="p-4 text-destructive" role="alert">
          {archiveError}
        </p>
      )}
      {error ? (
        <div className="flex flex-wrap items-center gap-3 p-4 text-destructive" role="alert">
          {error}
          <Button variant="outline" onClick={() => retry(attempt + 1)}>
            {t("sign.retry")}
          </Button>
        </div>
      ) : !ready ? (
        <p role="status" className="p-4 text-muted-foreground">
          {t("sign.loading")}
        </p>
      ) : items.length === 0 ? (
        <EmptyState icon={getIconByName("FileStack")} title={t("sign.noDrafts")} />
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li
              className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm"
              key={item.templateId}
            >
              <Link
                className="mr-auto break-all font-medium hover:underline"
                to={endpoint + "/" + item.templateId + "/edit" + suffix}
              >
                {item.title}
              </Link>
              <span>{t("sign.revision", { revision: item.revision })}</span>
              {item.archived ? (
                <span>{t("sign.archived")}</span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!archiving}
                  onClick={() => void archive(item)}
                >
                  {t("sign.archive")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {ready && !error && next && (
        <Link
          to={"?cursor=" + next + (engagement ? "&coaching=" + encodeURIComponent(engagement) : "")}
        >
          {t("sign.nextPage")}
        </Link>
      )}

    </CrudListPageLayout>
  );
}
