import type { TransactionContext } from "@corely/kernel";
import type { StudioScope } from "./openbuk-repository.port";

export const OPENBUK_GUEST_ACCESS_STORE = Symbol("OPENBUK_GUEST_ACCESS_STORE");
export const OPENBUK_GUEST_SIGNING_SECRET = Symbol("OPENBUK_GUEST_SIGNING_SECRET");

export interface GuestCredential {
  bookingId: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface OpenBukGuestAccessStore {
  find(
    scope: StudioScope,
    digest: string,
    tx?: TransactionContext
  ): Promise<GuestCredential | null>;
  save(
    scope: StudioScope,
    digest: string,
    credential: GuestCredential,
    tx: TransactionContext
  ): Promise<void>;
}
