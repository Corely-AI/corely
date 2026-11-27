import { SignRequestSourceSchema, type SignRequestDraft } from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { useEffect, useState } from "react";

GlobalWorkerOptions.workerSrc = workerUrl;

export function useRequestDocument(draft: SignRequestDraft, workspace: string) {
  type Source = ReturnType<typeof SignRequestSourceSchema.parse>;
  const [ready, setReady] = useState<{ pdf: PDFDocumentProxy; source: Source }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const revision = draft.configuration?.revision ?? 0;

  useEffect(() => {
    const controller = new AbortController();
    let job: ReturnType<typeof getDocument> | undefined;
    setFailed(false);
    setReady(undefined);
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
        const source = SignRequestSourceSchema.parse(value);
        if (source.sha256 !== draft.canonicalSha256 || (source.draftRevision ?? 0) !== revision) {
          throw new Error("Unexpected request document revision");
        }
        job = getDocument({
          data: Uint8Array.from(atob(source.base64), (character) => character.charCodeAt(0)),
        });
        const pdf = await job.promise;
        if (!controller.signal.aborted) {
          setReady({ pdf, source });
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
  }, [attempt, draft.canonicalSha256, draft.requestId, revision, workspace]);

  return { ready, failed, retry: () => setAttempt((n) => n + 1) };
}
