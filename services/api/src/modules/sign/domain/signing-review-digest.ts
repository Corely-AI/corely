import type { Ceremony, Signer } from "./ceremony";
import { hash } from "./digest";

export function signingReviewDigest(c: Ceremony, s: Signer, sha: string) {
  return hash(JSON.stringify([c.requestId, s.id, c.consent, c.sentAt.toISOString(), sha]));
}
