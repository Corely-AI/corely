import type { TransactionContext } from "@corely/kernel";
import type { SignRequestDraft, SignValues } from "@corely/contracts";
import type { Ceremony, RequestRef, Signer } from "../../domain/ceremony";

export type CeremonyPatch = Partial<
  Pick<
    Ceremony,
    | "status"
    | "leaseId"
    | "leaseUntil"
    | "candidateSha256"
    | "finalizationFailed"
    | "verifiedAt"
    | "artifactSha256"
    | "evidenceSha256"
  >
>;
export type SignerPatch = Partial<
  Omit<Signer, keyof RequestRef | "id" | "position" | "roleId" | "values">
> & { values?: SignValues };
export abstract class CeremonyRepository {
  abstract clearExpiredSessions(now: Date): Promise<void>;
  abstract expired(now: Date): Promise<RequestRef[]>;
  abstract claimReminder(
    ref: RequestRef,
    commandId: string,
    roleId: string,
    tx: TransactionContext
  ): Promise<"new" | "same" | "conflict" | "limited">;
  abstract lock(ref: RequestRef, tx: TransactionContext): Promise<void>;
  abstract draft(
    ref: RequestRef,
    tx: TransactionContext
  ): Promise<(SignRequestDraft & { actorId: string }) | null>;
  abstract ceremony(ref: RequestRef, tx: TransactionContext): Promise<Ceremony | null>;
  abstract signers(ref: RequestRef, tx: TransactionContext): Promise<Signer[]>;
  abstract byDigest(
    kind: "sessionDigest" | "tokenDigest",
    digest: string,
    tx: TransactionContext
  ): Promise<Signer | null>;
  abstract create(
    value: Ceremony,
    roles: { id: string; roleId: string; position: number }[],
    tx: TransactionContext
  ): Promise<void>;
  abstract change(ref: RequestRef, patch: CeremonyPatch, tx: TransactionContext): Promise<void>;
  abstract updateSigner(
    ref: RequestRef,
    id: string,
    patch: SignerPatch,
    tx: TransactionContext
  ): Promise<void>;
}
