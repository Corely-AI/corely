import type { SignRequestDraft } from "@corely/contracts";
import { Button, LoadingSkeleton } from "@corely/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldOverlay } from "./field-overlay";
import { SignEditorPreview } from "./template-editor-panes";
import { useRequestDocument } from "./use-request-document";
import { signerColor } from "./signer-colors";

export default function RequestDocumentPreview({
  draft,
  workspace,
  onReady,
}: {
  draft: SignRequestDraft;
  workspace: string;
  onReady: (ready: boolean) => void;
}) {
  const { t } = useTranslation();
  const { ready: preview, failed, retry } = useRequestDocument(draft, workspace);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [role, setRole] = useState(draft.recipients[0].roleId);
  useEffect(() => onReady(Boolean(preview)), [onReady, preview]);

  if (failed) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-destructive">
          {t("sign.sourceError")}
        </p>
        <Button variant="outline" onClick={retry}>
          {t("sign.retry")}
        </Button>
      </div>
    );
  }
  if (!preview) {
    return <LoadingSkeleton label={t("sign.opening")} variant="detail" />;
  }
  const recipient = draft.recipients.find((person) => person.roleId === role);
  const colorIndex =
    draft.configuration?.layout.roles.findIndex((signer) => signer.id === role) ??
    draft.recipients.findIndex((signer) => signer.roleId === role);
  return (
    <div className="space-y-3">
      {preview.source.fields ? (
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
        {preview.source.fields
          ?.filter((field) => field.pageIndex === page && field.roleId === role)
          .map((field) => (
            <FieldOverlay
              key={field.id}
              field={field}
              roleName={recipient?.name ?? ""}
              selected={false}
              color={signerColor(colorIndex)}
              preview
              onSelect={() => {}}
              onChange={() => {}}
            />
          ))}
      </SignEditorPreview>
    </div>
  );
}
