import type { SignDraft, SignLayout } from "@corely/contracts";

export function nextTemplateRevision(
  templateId: string,
  previous: SignDraft | null,
  expectedRevision: number,
  changes: Pick<SignDraft, "title" | "layout"> | null
): { draft: SignDraft } | { conflict: string } {
  if (previous?.archived) {
    return { conflict: "Template is archived." };
  }
  const content = changes ?? previous;
  if (!content || (previous?.revision ?? 0) !== expectedRevision) {
    return { conflict: "The template draft has changed" };
  }
  return {
    draft: {
      templateId,
      revision: expectedRevision + 1,
      archived: changes === null,
      title: content.title,
      layout: content.layout,
    },
  };
}

export function hasRequiredSignatures(layout: SignLayout) {
  return layout.roles.every((role) =>
    layout.fields.some(
      (field) => field.roleId === role.id && field.type === "signature" && field.required
    )
  );
}
