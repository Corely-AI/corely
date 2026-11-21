import type { SignRequestDraft } from "@corely/contracts";
import type { Ceremony, Signer } from "./ceremony";

export function validSigningExpiry(expiresAt: Date, now: Date) {
  const duration = expiresAt.getTime() - now.getTime();
  return duration > 0 && duration <= 90 * 24 * 60 * 60 * 1000;
}

export function effectiveCeremonyStatus(
  ceremony: Pick<Ceremony, "status" | "expiresAt"> | null,
  now: Date
) {
  if (!ceremony) {
    return "DRAFT";
  }
  return ceremony.status === "SENT" && ceremony.expiresAt <= now ? "EXPIRED" : ceremony.status;
}

export function signingProgress<T extends Pick<Signer, "status" | "position">>(
  routing: SignRequestDraft["routing"],
  signers: readonly T[]
): { collected: boolean; toInvite: T[] } {
  const pending = signers.filter((signer) => signer.status !== "ACCEPTED");
  const collected = signers.length > 0 && pending.length === 0;
  if (routing === "parallel") {
    return { collected, toInvite: pending.filter((signer) => signer.status === "WAITING") };
  }
  const next = pending.sort((a, b) => a.position - b.position)[0];
  return { collected, toInvite: next?.status === "WAITING" ? [next] : [] };
}
