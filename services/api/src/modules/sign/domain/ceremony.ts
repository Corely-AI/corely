import type { SignLayout, SignValues } from "@corely/contracts";

export type RequestRef = { tenantId: string; workspaceId: string; requestId: string };
export type Ceremony = RequestRef & {
  status: string;
  expiresAt: Date;
  sentAt: Date;
  senderWorkspace?: string | null;
  consent: string;
  invitation: string;
  revision: number;
  leaseId?: string | null;
  leaseUntil?: Date | null;
  candidateSha256?: string | null;
  finalizationFailed?: boolean;
  verifiedAt: Date | null;
  artifactSha256: string | null;
  evidenceSha256: string | null;
};
export type Signer = RequestRef & {
  id: string;
  roleId: string;
  position: number;
  status: string;
  tokenDigest: string | null;
  envelope: string | null;
  sessionDigest: string | null;
  sessionUntil: Date | null;
  deliveredAt: Date | null;
  acceptedAt: Date | null;
  values: unknown;
  reviewedSha256: string | null;
};

export function validateRecipientValues(
  layout: SignLayout,
  roleId: string,
  entries: SignValues,
  partial = false
) {
  const fields = layout.fields.filter((f) => f.roleId === roleId);
  const seen = new Set<string>();
  for (const { fieldId, value } of entries) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || seen.has(fieldId)) {
      return false;
    }
    seen.add(fieldId);
    if (field.type === "checkbox") {
      if (typeof value !== "boolean" || (field.required && !value)) {
        return false;
      }
    } else if (typeof value === "object") {
      if (
        !value ||
        !["signature", "initials"].includes(field.type) ||
        !value.strokes.some((stroke) =>
          stroke.some(([x, y]) => Math.abs(x - stroke[0][0]) + Math.abs(y - stroke[0][1]) > 0.01)
        )
      ) {
        return false;
      }
    } else {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        Array.from(value).some((character) => character < " " || character === "\u007f")
      ) {
        return false;
      }
      if (
        field.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      ) {
        return false;
      }
    }
  }
  return partial || fields.every((f) => !f.required || seen.has(f.id));
}

export function requestRefOf(row: RequestRef): RequestRef {
  return { tenantId: row.tenantId, workspaceId: row.workspaceId, requestId: row.requestId };
}
