import type { SignRequestDraft } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { SignDraftRepository, SignScope } from "../ports/sign-draft.repository";

export async function requestLayout(
  templates: SignDraftRepository,
  { tenantId, workspaceId }: SignScope,
  draft: SignRequestDraft,
  tx: TransactionContext
) {
  return (
    draft.configuration?.layout ??
    (
      await templates.version(
        { tenantId, workspaceId },
        draft.templateId,
        draft.templateRevision,
        tx
      )
    )?.layout
  );
}
