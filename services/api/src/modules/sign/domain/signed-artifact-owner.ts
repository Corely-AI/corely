import type { RequestRef } from "./ceremony";

export function signedArtifactOwner(ref: RequestRef, sha256: string) {
  return {
    tenantId: ref.tenantId,
    workspaceId: ref.workspaceId,
    templateId: "signed-request/" + ref.requestId,
    sha256,
  };
}
