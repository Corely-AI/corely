import { SignRequestSourceSchema, type SignRequestDraft } from "@corely/contracts";
import { Button, LoadingSkeleton } from "@corely/ui";
import { apiClient } from "@corely/web-shared/lib/api-client";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldOverlay } from "./field-overlay";
import { SignEditorPreview } from "./template-editor-panes";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function RequestDocumentPreview({
  draft,
  workspace,
}: {
  draft: SignRequestDraft;
  workspace: string;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<{
    pdf: PDFDocumentProxy;
    fields: ReturnType<typeof SignRequestSourceSchema.parse>["fields"];
  }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [role, setRole] = useState(draft.recipients[0].roleId);

  useEffect(() => {
    const controller = new AbortController();
    let job: ReturnType<typeof getDocument> | undefined;
    setFailed(false);
    void (async () => {
      try {
        const value = await apiClient.request(
          "/sign/requests/" + draft.requestId + "/source",
          { headers: { "X-Workspace-Id": workspace } },
          { workspaceScope: "none", signal: controller.signal }
        );
        if (controller.signal.aborted) {
          return;
        }
        const { base64, sha256, fields } = SignRequestSourceSchema.parse(value);
        if (sha256 !== draft.canonicalSha256) {
          throw new Error("Unexpected request document");
        }
        job = getDocument({
          data: Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)),
        });
        const pdf = await job.promise;
        if (!controller.signal.aborted) {
          setPreview({ pdf, fields });
        }
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      }
    })();
    return () => {
      controller.abort();
      void job?.destroy().catch(() => {});
    };
  }, [attempt, draft.canonicalSha256, draft.requestId, workspace]);

  if (failed) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-destructive">
          {t("sign.sourceError")}
        </p>
        <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
          {t("sign.retry")}
        </Button>
      </div>
    );
  }
  if (!preview) {
    return <LoadingSkeleton label={t("sign.opening")} variant="detail" />;
  }
  const recipient = draft.recipients.find((person) => person.roleId === role);
  return (
    <div className="space-y-3">
      {preview.fields ? (
        <label className="grid gap-1 text-sm font-medium">
          {t("sign.previewRecipient")}
          <select
            className="min-h-11 w-full rounded-md border bg-background px-3"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {draft.recipients.map((person) => (
              <option key={person.roleId} value={person.roleId}>
                {person.name} ({person.email})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">{t("sign.previewFieldsUnavailable")}</p>
      )}
      <SignEditorPreview
        pdf={preview.pdf}
        page={page}
        zoom={zoom}
        onPageChange={setPage}
        onZoomChange={setZoom}
      >
        {preview.fields
          ?.filter((field) => field.pageIndex === page && field.roleId === role)
          .map((field) => (
            <FieldOverlay
              key={field.id}
              field={field}
              roleName={recipient?.name ?? ""}
              selected={false}
              preview
              onSelect={() => {}}
              onChange={() => {}}
            />
          ))}
      </SignEditorPreview>
    </div>
  );
}
