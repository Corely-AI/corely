import type { SignLayout, CreateSignRequestDraft } from "@corely/contracts";
export function recipientsMatchRoles(
  layout: SignLayout,
  request: Pick<CreateSignRequestDraft, "recipients">
) {
  const provided = new Set(request.recipients.map((recipient) => recipient.roleId));
  return (
    provided.size === request.recipients.length &&
    provided.size === layout.roles.length &&
    layout.roles.every((role) => provided.has(role.id))
  );
}
