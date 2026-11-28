import type { OperationalRequestDraft, OperationalRequestKind } from "@corely/contracts";
import { Input, Label, Textarea } from "@corely/ui";
import type { RequestsCopy } from "./requests-copy";

export function emptyDraft(kind: OperationalRequestKind): OperationalRequestDraft {
  const policyDocumentId = null;
  switch (kind) {
    case "ABSENCE":
      return { kind, firstDay: null, lastDay: null, reason: "", policyDocumentId };
    case "EQUIPMENT":
      return { kind, item: "", quantity: null, justification: "", policyDocumentId };
    case "GENERAL":
      return { kind, subject: "", details: "", policyDocumentId };
  }
}
export function kindLabel(kind: OperationalRequestKind, copy: RequestsCopy) {
  return { ABSENCE: copy.absence, EQUIPMENT: copy.equipment, GENERAL: copy.general }[kind];
}

export function RequestDraftFields({
  draft,
  change,
  editable,
  copy,
}: {
  draft: OperationalRequestDraft;
  change: (draft: OperationalRequestDraft) => void;
  editable: boolean;
  copy: RequestsCopy;
}) {
  const input = (
    key: string,
    label: string,
    value: string | number | null,
    set: (value: string) => void,
    type = "text"
  ) => (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={value ?? ""}
        onChange={(event) => set(event.target.value)}
        readOnly={!editable}
        {...(type === "number" ? { min: 1, max: 100 } : {})}
      />
    </div>
  );
  const text = (key: string, label: string, value: string, set: (value: string) => void) => (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={key}>{label}</Label>
      <Textarea
        id={key}
        rows={4}
        value={value}
        onChange={(event) => set(event.target.value)}
        readOnly={!editable}
        maxLength={key === "reason" ? 500 : 1000}
      />
    </div>
  );
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {draft.kind === "ABSENCE" && (
        <>
          {input(
            "firstDay",
            copy.firstDay,
            draft.firstDay,
            (value) => change({ ...draft, firstDay: value || null }),
            "date"
          )}
          {input(
            "lastDay",
            copy.lastDay,
            draft.lastDay,
            (value) => change({ ...draft, lastDay: value || null }),
            "date"
          )}
          {text("reason", copy.reason, draft.reason, (reason) => change({ ...draft, reason }))}
        </>
      )}
      {draft.kind === "EQUIPMENT" && (
        <>
          {input("item", copy.item, draft.item, (item) => change({ ...draft, item }))}
          {input(
            "quantity",
            copy.quantity,
            draft.quantity,
            (value) => change({ ...draft, quantity: value ? Number(value) : null }),
            "number"
          )}
          {text("justification", copy.justification, draft.justification, (justification) =>
            change({ ...draft, justification })
          )}
        </>
      )}
      {draft.kind === "GENERAL" && (
        <>
          {input("subject", copy.subject, draft.subject, (subject) =>
            change({ ...draft, subject })
          )}
          {text("details", copy.details, draft.details, (details) => change({ ...draft, details }))}
        </>
      )}
      {(editable || draft.policyDocumentId) &&
        input("policy", copy.policy, draft.policyDocumentId, (value) =>
          change({ ...draft, policyDocumentId: value || null })
        )}
    </div>
  );
}
