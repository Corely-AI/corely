import type { SignLayout, SignValues } from "@corely/contracts";
export type AcceptanceEvidence = {
  roleId: string;
  recipientId: string;
  name: string;
  email: string;
  acceptedAt: string;
  reviewedSha256: string;
  values: SignValues;
};
export type SignEvidence = {
  schemaVersion: 1;
  requestId: string;
  workspaceId: string;
  tenantId: string;
  templateId: string;
  templateRevision: number;
  sourceSha256: string;
  senderWorkspace?: string | null;
  senderId: string;
  renderer: string;
  sentAt: string;
  consent: string;
  routing: string;
  acceptances: AcceptanceEvidence[];
};
export type SignVerification = {
  profile: "adbe.pkcs7.detached";
  artifactSha256: string;
  evidenceSha256: string | null;
  sourceSha256: string;
  verifiedAt?: string;
  timestampAuthority: null;
};

export abstract class SignArtifactEngine {
  abstract bundle(
    source: Buffer,
    signed: Buffer,
    evidence: Buffer,
    verification: SignVerification
  ): Buffer;
  abstract preview(
    source: Buffer,
    layout: SignLayout,
    roleId: string,
    values: SignValues
  ): Promise<Buffer>;
  abstract generate(source: Buffer, layout: SignLayout, evidence: SignEvidence): Promise<Buffer>;
  abstract evidence(bytes: Buffer): Promise<Buffer>;
  abstract verify(bytes: Buffer, at?: Date): Promise<void>;
}
